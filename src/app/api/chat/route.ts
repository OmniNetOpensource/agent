import { NextResponse } from "next/server";
import { callToolByName, toolSpecs } from "@/src/shared/lib/tools";
import type { OpenRouter } from "@openrouter/sdk";
import {
  DEFAULT_CHAT_MODEL_ID,
  getOpenRouterClient,
  getOpenRouterHeaders,
  isSupportedChatModel,
} from "@/src/features/model/lib/openrouter";
import type {
  Message,
  ResearchItem,
  ToolProgress,
} from "@/src/features/chat/types/chat";
import type { ToolProgressUpdate } from "@/src/shared/lib/tools/types";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import type { ChatRequest } from "@/src/features/chat/types/chat";
import {
  buildAssistantBlocks,
  buildSystemPrompt,
  ChatMessage,
  StreamToolCall,
  toChatMessages,
} from "./utils";
import {
  ensureConversation,
  SavedMessageIds,
  saveMessages,
} from "./repository";

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning?: string;
      toolCalls?: StreamToolCall[];
    };
    finishReason?: string | null;
  }>;
};

// Type for OpenRouter SDK's chat.send method (SDK types may be incomplete)
type ChatSendMethod = {
  send: (
    params: {
      model: string;
      messages: ChatMessage[];
      tools?: unknown[];
      stream: boolean;
    },
    options?: { headers?: Record<string, string> }
  ) => Promise<AsyncIterable<StreamChunk>>;
};

const DEFAULT_MODEL = DEFAULT_CHAT_MODEL_ID;
const encoder = new TextEncoder();

export async function POST(req: Request) {
  try {
    const { conversationHistory, conversationId, model, searchEnabled } =
      (await req.json()) as ChatRequest;

    if (
      !Array.isArray(conversationHistory) ||
      conversationHistory.length === 0
    ) {
      return NextResponse.json(
        { reply: "Invalid conversation history" },
        { status: 400 }
      );
    }

    const latestUserMessage = [...conversationHistory]
      .reverse()
      .find((msg) => msg.role === "user");

    if (
      !latestUserMessage ||
      !Array.isArray(latestUserMessage.blocks) ||
      latestUserMessage.blocks.length === 0
    ) {
      return NextResponse.json(
        { reply: "Missing user message" },
        { status: 400 }
      );
    }

    const requestedModel = isSupportedChatModel(model) ? model : DEFAULT_MODEL;

    const isGeminiModel = requestedModel.toLowerCase().includes("gemini");

    const tools =
      searchEnabled === false || isGeminiModel ? [] : toolSpecs;

    if (isGeminiModel && searchEnabled !== false) {
      console.log(
        "[Chat-API] Detected Gemini model, disabling tools to avoid missing reasoning details / thought_signature errors."
      );
    }

    console.log(
      "[Chat-API] Tools loaded:",
      tools.length,
      tools
        .map(
          (tool) =>
            (tool as { type: "function"; function: { name: string } }).function
              .name
        )
        .join(", ")
    );

    let openRouterClient: OpenRouter;
    try {
      openRouterClient = getOpenRouterClient();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Missing OPENROUTER_API_KEY";
      return NextResponse.json({ reply: message }, { status: 500 });
    }

    const supabase = hasSupabaseConfig()
      ? await createSupabaseServerClient()
      : null;

    let supabaseUser: { id: string } | null = null;
    if (supabase) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        console.error("[Chat-API] Supabase auth error:", authError.message);
      }
      supabaseUser = user ?? null;
    }

    let activeConversationId = conversationId ?? null;
    let conversationCreatedEvent: {
      type: "conversation_created";
      conversationId: string;
      title: string;
      user_id: string;
      created_at: string;
      updated_at: string;
    } | null = null;

    const history: Message[] = conversationHistory.map((message) => ({
      ...message,
      blocks: Array.isArray(message.blocks) ? message.blocks : [],
    }));

    if (supabaseUser && supabase && activeConversationId) {
      const result = await ensureConversation(
        supabase,
        supabaseUser,
        activeConversationId,
        latestUserMessage
      );
      activeConversationId = result.conversationId;
      conversationCreatedEvent = result.event;
    }

    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(searchEnabled) },
      ...toChatMessages(history),
    ];

    console.log(`[Chat-API] Using model: ${requestedModel}`);

    const stream = new ReadableStream({
      async start(controller) {
        const currentMessages: ChatMessage[] = [...messages];
        const researchItems: ResearchItem[] = [];
        const maxIterations = 20;
        let iteration = 0;
        let finalAssistantMessage: string | null = null;
        let streamClosed = false;
        const messageIds: SavedMessageIds = {
          userMessageId: null,
          assistantMessageId: null,
        };

        if (conversationCreatedEvent) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify(conversationCreatedEvent)}\n\n`
            )
          );
        }

        const closeStream = () => {
          if (!streamClosed) {
            controller.close();
            streamClosed = true;
          }
        };

        const appendThinking = (chunk: string) => {
          if (!chunk) return;
          const last = researchItems[researchItems.length - 1];
          if (last?.kind === "thinking") {
            researchItems[researchItems.length - 1] = {
              ...last,
              text: `${last.text}${chunk}`,
            };
          } else {
            researchItems.push({ kind: "thinking", text: chunk });
          }
        };

        const findToolIndex = (toolName: string) => {
          let fallback = -1;
          for (let i = researchItems.length - 1; i >= 0; i--) {
            const item = researchItems[i];
            if (item.kind === "tool" && item.data.call.tool === toolName) {
              if (!item.data.result) {
                return i;
              }
              if (fallback === -1) {
                fallback = i;
              }
            }
          }
          return fallback;
        };

        const ensureToolItem = (
          toolName: string,
          args: Record<string, unknown>
        ) => {
          const idx = findToolIndex(toolName);
          if (idx === -1) {
            researchItems.push({
              kind: "tool",
              data: {
                call: { tool: toolName, args },
                progress: [],
              },
            });
            return researchItems.length - 1;
          }
          return idx;
        };

        const appendToolProgress = (
          toolName: string,
          progress: ToolProgress
        ) => {
          const idx = ensureToolItem(toolName, {});
          const item = researchItems[idx];
          if (item.kind === "tool") {
            const existing = item.data.progress ?? [];
            researchItems[idx] = {
              ...item,
              data: { ...item.data, progress: [...existing, progress] },
            };
          }
        };

        const appendToolResult = (toolName: string, result: string) => {
          const idx = ensureToolItem(toolName, {});
          const item = researchItems[idx];
          if (item.kind === "tool") {
            researchItems[idx] = {
              ...item,
              data: { ...item.data, result: { result } },
            };
          }
        };

        try {
          while (iteration < maxIterations) {
            iteration++;
            console.log(
              `[Chat-API] Iteration ${iteration}, messages:`,
              currentMessages.length
            );

            const completion = await (
              openRouterClient.chat as ChatSendMethod
            ).send(
              {
                model: requestedModel,
                messages: currentMessages,
                tools: tools.length > 0 ? tools : undefined,
                stream: true,
              },
              {
                headers: getOpenRouterHeaders(),
              }
            );
            let assistantMessage = "";
            let currentReasoning = "";
            const toolCalls: Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }> = [];
            let currentToolCallIndex = -1;
            let finishedWithStop = false;

            for await (const chunk of completion as AsyncIterable<StreamChunk>) {
              console.log(
                "[Chat-API] OpenRouter chunk:",
                JSON.stringify(chunk)
              );
              const delta = chunk?.choices?.[0]?.delta;
              const finishReason = chunk?.choices?.[0]?.finishReason as
                | string
                | undefined;

              if (delta?.reasoning) {
                currentReasoning += delta.reasoning;
                appendThinking(delta.reasoning);
                const data = {
                  type: "thinking",
                  content: delta.reasoning,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                );
              }

              if (delta?.content) {
                assistantMessage += delta.content;
                const data = {
                  type: "content",
                  content: delta.content,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                );
              }

              if (delta?.toolCalls) {
                for (const toolCall of delta.toolCalls as StreamToolCall[]) {
                  if (
                    toolCall.index !== undefined &&
                    toolCall.index !== currentToolCallIndex
                  ) {
                    currentToolCallIndex = toolCall.index;
                    toolCalls[currentToolCallIndex] = {
                      id: toolCall.id || "",
                      type: "function",
                      function: {
                        name: toolCall.function?.name || "",
                        arguments: toolCall.function?.arguments || "",
                      },
                    };
                  } else if (
                    currentToolCallIndex >= 0 &&
                    toolCall.function?.arguments
                  ) {
                    const currentToolCall = toolCalls[currentToolCallIndex];
                    if (
                      currentToolCall &&
                      currentToolCall.type === "function"
                    ) {
                      currentToolCall.function.arguments +=
                        toolCall.function.arguments;
                    }
                  }
                }
              }

              if (finishReason === "stop") {
                console.log("[Chat-API] Stream finished with stop");
                finishedWithStop = true;
                break;
              }

              if (finishReason === "tool_calls" && toolCalls.length > 0) {
                console.log(
                  "[Chat-API] Stream finished with tool_calls:",
                  toolCalls.length
                );
                break;
              }
            }

            if (finishedWithStop) {
              finalAssistantMessage = assistantMessage;
              closeStream();
              break;
            }

            if (toolCalls.length === 0) {
              console.log("[Chat-API] No tool calls, ending");
              finalAssistantMessage = assistantMessage;
              closeStream();
              break;
            }

            currentMessages.push({
              role: "assistant",
              content: assistantMessage || null,
              toolCalls,
              reasoning: currentReasoning || undefined,
            });

            if (supabaseUser && supabase && activeConversationId) {
              const partialAssistantBlocks = buildAssistantBlocks(
                researchItems,
                assistantMessage || null
              );
              await saveMessages(
                supabase,
                activeConversationId,
                latestUserMessage,
                partialAssistantBlocks,
                messageIds
              );
              const updatedEvent = {
                type: "conversation_updated",
                conversationId: activeConversationId,
                updated_at: new Date().toISOString(),
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(updatedEvent)}\n\n`)
              );
            }

            console.log("[Chat-API] Executing", toolCalls.length, "tool calls");
            for (const toolCall of toolCalls) {
              if (toolCall.type !== "function") continue;

              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

              console.log(
                "[Chat-API] Calling tool:",
                toolName,
                "with args:",
                toolArgs
              );

              const toolCallData = {
                type: "tool_call",
                tool: toolName,
                args: toolArgs,
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(toolCallData)}\n\n`)
              );
              ensureToolItem(toolName, toolArgs);

              const result = await callToolByName(
                toolName,
                toolArgs,
                (progress: ToolProgressUpdate) => {
                  const toolProgressData = {
                    type: "tool_progress",
                    tool: toolName,
                    ...progress,
                  };
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify(toolProgressData)}\n\n`
                    )
                  );
                  appendToolProgress(toolName, {
                    stage: progress.stage,
                    message: String(progress.message ?? ""),
                    receivedBytes: progress.receivedBytes,
                    totalBytes: progress.totalBytes,
                  });
                }
              );

              const toolResultData = {
                type: "tool_result",
                tool: toolName,
                result: result,
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(toolResultData)}\n\n`)
              );

              const normalizedResult =
                typeof result === "string"
                  ? result
                  : (() => {
                      try {
                        return JSON.stringify(result);
                      } catch {
                        return String(result);
                      }
                    })();

              appendToolResult(toolName, normalizedResult);

              currentMessages.push({
                role: "tool",
                toolCallId: toolCall.id,
                content: result,
              });
            }
          }

          if (iteration >= maxIterations && !streamClosed) {
            console.log("[Chat-API] Max iterations reached");
            const data = {
              type: "content",
              content: "\n\n[已达到最大工具调用次数限制]",
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
            finalAssistantMessage =
              finalAssistantMessage ?? "\n\n[已达到最大工具调用次数限制]";
            closeStream();
          }

          const assistantBlocks = buildAssistantBlocks(
            researchItems,
            finalAssistantMessage
          );

          if (supabaseUser && supabase && activeConversationId) {
            await saveMessages(
              supabase,
              activeConversationId,
              latestUserMessage,
              assistantBlocks,
              messageIds
            );
            const updatedEvent = {
              type: "conversation_updated",
              conversationId: activeConversationId,
              updated_at: new Date().toISOString(),
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(updatedEvent)}\n\n`)
            );
          }

          closeStream();
        } catch (error) {
          console.error("[Chat-API] Error:", error);
          if (!streamClosed) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorData = {
              type: "content",
              content: `\n\n错误：${errorMessage}`,
            };
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
              );
            } catch (enqueueError) {
              console.error(
                "[Chat-API] Failed to enqueue error message:",
                enqueueError
              );
            }
            closeStream();
          }
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Chat-API] Top-level error:", error);
    return NextResponse.json(
      { reply: "Unable to process request" },
      { status: 500 }
    );
  }
}
