import { NextResponse } from "next/server";
import { callToolByName, toolSpecs } from "@/src/shared/lib/tools";
import type { OpenRouter } from "@openrouter/sdk";
import {
  DEFAULT_CHAT_MODEL_ID,
  getOpenRouterClient,
  getOpenRouterHeaders,
  isSupportedChatModel,
} from "@/src/features/model/lib/openrouter";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentBlock,
  Message,
  ResearchItem,
  ToolProgress,
} from "@/src/features/chat/types/chat";
import type { ToolProgressUpdate } from "@/src/shared/lib/tools/types";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import type { ChatRequest } from "@/src/features/chat/types/chat";

type StreamToolCall = {
  index?: number;
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
};

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

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: unknown;
  toolCalls?: StreamToolCall[];
  toolCallId?: string;
  name?: string;
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

const buildSystemPrompt = () => `
今天的日期是：${new Date().toISOString().slice(0, 10)}

# 需要搜索的时候：非必要情况下不要用中文搜索；在没有足够上下文之前不要回答；如果没有搞清楚，就不断调研直到搞清楚，不要只是了解皮毛，要深入搜索资料去了解，要了解全方位的资料搜寻才能开始回答。

# 什么时候不需要搜索：已知的知识

- 搜索工具使用技法：多次组合不同关键词进行多次搜索
- 获取更详细的信息：fetch 特定网页
`;

const buildConversationTitle = (message: Message) => {
  const text = message.blocks
    .filter((b) => b.type === "content")
    .map((b) => b.content)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "新会话";
  }

  const normalized = text.replace(/\r?\n/g, " ").trim();
  return normalized.length > 50 ? `${normalized.slice(0, 50)}...` : normalized;
};

const toChatMessages = (history: Message[]): ChatMessage[] =>
  history
    .map((msg) => {
      const relevantBlocks = msg.blocks.filter(
        (block) => block.type === "content" || block.type === "attachments"
      );

      const contentParts: unknown[] = [];

      for (const block of relevantBlocks) {
        if (block.type === "content") {
          contentParts.push({
            type: "text",
            text: block.content,
          });
        } else if (block.type === "attachments") {
          for (const att of block.attachments) {
            const base64Data = att.dataUrl.split(",")[1] || att.dataUrl;

            if (att.kind === "image") {
              contentParts.push({
                type: "image_url",
                imageUrl: { url: att.dataUrl },
              });
            } else if (att.kind === "video") {
              contentParts.push({
                type: "video_url",
                videoUrl: { url: att.dataUrl },
              });
            } else if (att.kind === "audio") {
              const format = att.mimeType.split("/")[1]?.split(";")[0] || "wav";
              contentParts.push({
                type: "input_audio",
                inputAudio: { data: base64Data, format },
              });
            } else {
              contentParts.push({
                type: "file",
                file: { filename: att.name, fileData: att.dataUrl },
              });
            }
          }
        }
      }

      return {
        role: msg.role,
        content: contentParts,
      };
    })
    .filter((msg) => {
      if (msg.role !== "assistant") {
        return true;
      }
      return Array.isArray(msg.content) && msg.content.length > 0;
    });

const buildAssistantBlocks = (
  items: ResearchItem[],
  content: string | null
): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  if (items.length > 0) {
    blocks.push({ type: "research", items });
  }
  if (content) {
    blocks.push({ type: "content", content });
  }
  return blocks;
};

type SavedMessageIds = {
  userMessageId: string | null;
  assistantMessageId: string | null;
};

const generateMessageId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const saveMessages = async (
  supabase: SupabaseClient,
  conversationId: string,
  userMessage: Message,
  assistantBlocks: ContentBlock[],
  messageIds: SavedMessageIds
) => {
  const nextIds: SavedMessageIds = {
    userMessageId: messageIds.userMessageId ?? generateMessageId(),
    assistantMessageId:
      assistantBlocks.length > 0
        ? messageIds.assistantMessageId ?? generateMessageId()
        : messageIds.assistantMessageId,
  };

  const rows = [
    {
      id: nextIds.userMessageId,
      conversation_id: conversationId,
      role: "user",
      blocks: userMessage.blocks,
    },
  ];

  if (assistantBlocks.length > 0) {
    rows.push({
      id: nextIds.assistantMessageId,
      conversation_id: conversationId,
      role: "assistant",
      blocks: assistantBlocks,
    });
  }

  const { error: upsertError } = await supabase
    .from("messages")
    .upsert(rows, { onConflict: "id" });

  if (upsertError) {
    console.error("[Chat-API] Failed to save messages:", upsertError.message);
  }

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (updateError) {
    console.error(
      "[Chat-API] Failed to update conversation timestamp:",
      updateError.message
    );
  }

  messageIds.userMessageId = nextIds.userMessageId;
  messageIds.assistantMessageId = nextIds.assistantMessageId ?? null;
};

export async function POST(req: Request) {
  try {
    const { conversationHistory, conversationId, model } =
      (await req.json()) as ChatRequest;

    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
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

    const tools = toolSpecs;
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
    const history: Message[] = conversationHistory.map((message) => ({
      ...message,
      blocks: Array.isArray(message.blocks) ? message.blocks : [],
    }));

    if (supabaseUser && supabase && activeConversationId) {
      const { data: existingConversation, error: existingConversationError } =
        await supabase
          .from("conversations")
          .select("id")
          .eq("id", activeConversationId)
          .eq("user_id", supabaseUser.id)
          .maybeSingle();

      if (existingConversationError) {
        console.error(
          "[Chat-API] Failed to verify conversation:",
          existingConversationError.message
        );
        activeConversationId = null;
      } else if (!existingConversation) {
        const title = buildConversationTitle(latestUserMessage);
        const { error: createConversationError } = await supabase
          .from("conversations")
          .insert({
            id: activeConversationId,
            user_id: supabaseUser.id,
            title,
          });

          if (createConversationError) {
            console.error(
              "[Chat-API] Failed to create conversation:",
              createConversationError.message
            );
            activeConversationId = null;
          }
      }
    }

    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt() },
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
            const toolCalls: Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }> = [];
            let currentToolCallIndex = -1;
            let finishedWithStop = false;

            for await (const chunk of completion as AsyncIterable<StreamChunk>) {
              const delta = chunk?.choices?.[0]?.delta;
              const finishReason = chunk?.choices?.[0]?.finishReason as
                | string
                | undefined;

              if (delta?.reasoning) {
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
