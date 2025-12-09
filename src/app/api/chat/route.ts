import { NextResponse } from "next/server";
import { callToolByName, toolSpecs } from "@/src/shared/lib/tools";
import {
  isSupportedChatModel,
  streamChatCompletion,
  parseSSEStream,
} from "@/src/shared/lib/openrouter/server";
import { getModelPermissions } from "@/src/features/chat/lib/model-config";
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
import {
  ConversationLogger,
  createConversationLogger,
} from "@/src/shared/lib/conversation-logger";

const encoder = new TextEncoder();

export async function POST(req: Request) {
  let logger: ConversationLogger | null = null;

  try {
    const { conversationHistory, conversationId, model, searchEnabled } =
      (await req.json()) as ChatRequest;

    logger = createConversationLogger(conversationId ?? null);

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

    if (!isSupportedChatModel(model)) {
      return NextResponse.json(
        { reply: "Invalid or missing model" },
        { status: 400 }
      );
    }

    const requestedModel = model;

    const isGeminiModel = requestedModel.toLowerCase().includes("gemini");
    const modelPermissions = getModelPermissions(requestedModel);
    const canSearch = modelPermissions?.canSearch ?? true;

    // Disable tools if:
    // 1. User explicitly disabled search
    // 2. Model is Gemini (legacy check)
    // 3. Model doesn't support search
    const tools =
      searchEnabled === false || isGeminiModel || !canSearch ? [] : toolSpecs;

    if (isGeminiModel && searchEnabled !== false) {
      logger?.log(
        "[Chat-API] Detected Gemini model, disabling tools to avoid missing reasoning details / thought_signature errors."
      );
    }

    if (!canSearch && searchEnabled !== false) {
      logger?.log(
        `[Chat-API] Model "${requestedModel}" does not support search, disabling tools.`
      );
    }

    logger?.log(
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
        logger?.error("[Chat-API] Supabase auth error:", authError.message);
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

    logger?.log("[Chat-API] Using model:", requestedModel);

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
            logger?.log(
              "[Chat-API] Iteration",
              iteration,
              "messages:",
              currentMessages.length
            );

            let stream: ReadableStream<Uint8Array>;
            try {
              stream = await streamChatCompletion({
                model: requestedModel,
                messages: currentMessages,
                tools: tools.length > 0 ? tools : undefined,
              });
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to start chat completion";
              logger?.error("[Chat-API] Stream error:", error);
              const errorData = {
                type: "error",
                message: `错误：${message}`,
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
              );
              closeStream();
              break;
            }

            let assistantMessage = "";
            let currentReasoning = "";
            const toolCalls: Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }> = [];
            let currentToolCallIndex = -1;
            let finishedWithStop = false;

            for await (const chunk of parseSSEStream(stream)) {
              logger?.log("[Chat-API] OpenRouter chunk:", chunk);
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

              if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls as StreamToolCall[]) {
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
                logger?.log("[Chat-API] Stream finished with stop");
                finishedWithStop = true;
                break;
              }

              if (finishReason === "tool_calls" && toolCalls.length > 0) {
                logger?.log(
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
              logger?.log("[Chat-API] No tool calls, ending");
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

            logger?.log("[Chat-API] Executing", toolCalls.length, "tool calls");
            const toolResults = await Promise.all(
              toolCalls.map(async (toolCall) => {
                if (toolCall.type !== "function") return null;

                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(
                  toolCall.function.arguments || "{}"
                );

                logger?.log(
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

                return {
                  toolCallId: toolCall.id,
                  result,
                };
              })
            );

            for (const toolResult of toolResults) {
              if (!toolResult) continue;
              currentMessages.push({
                role: "tool",
                toolCallId: toolResult.toolCallId,
                content: toolResult.result,
              });
            }
          }

          if (iteration >= maxIterations && !streamClosed) {
            logger?.log("[Chat-API] Max iterations reached");
            const data = {
              type: "error",
              message: "[已达到最大工具调用次数限制]",
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
            if (!streamClosed) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(updatedEvent)}\n\n`)
              );
            }
          }

          closeStream();
        } catch (error) {
          logger?.error("[Chat-API] Error:", error);
          if (!streamClosed) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorData = {
              type: "error",
              message: `错误：${errorMessage}`,
            };
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
              );
            } catch (enqueueError) {
              logger?.error(
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
    if (logger) {
      logger.error("[Chat-API] Top-level error:", error);
    } else {
      console.error("[Chat-API] Top-level error:", error);
    }
    return NextResponse.json(
      { reply: "Unable to process request" },
      { status: 500 }
    );
  }
}
