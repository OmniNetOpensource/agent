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
import { buildConversationTitle } from "@/src/shared/utils/chatFormat";

const encoder = new TextEncoder();

const generateConversationId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export async function POST(req: Request) {
  let logger: ConversationLogger | null = null;

  try {
    const {
      conversationHistory,
      conversationId,
      model,
      searchEnabled,
      systemInstruction,
    } = (await req.json()) as ChatRequest;

    logger = createConversationLogger();

    logger?.log("FRONTEND", "Received chat request", {
      conversationId,
      model,
      searchEnabled,
      hasSystemInstruction: !!systemInstruction,
      messageCount: conversationHistory.length,
    });

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

    const modelPermissions = getModelPermissions(requestedModel);
    const canSearch = modelPermissions?.canSearch ?? true;

    // Disable tools if:
    // 1. User explicitly disabled search
    // 2. Model doesn't support search
    const tools = searchEnabled === false || !canSearch ? [] : toolSpecs;

    if (!canSearch && searchEnabled !== false) {
      logger?.log(
        "MODEL",
        `Model "${requestedModel}" does not support search, disabling tools.`
      );
    }

    logger?.log(
      "TOOLS",
      `Tools loaded: ${tools.length}`,
      tools.map(
        (tool) =>
          (tool as { type: "function"; function: { name: string } }).function
            .name
      )
    );

    const supabase = hasSupabaseConfig()
      ? await createSupabaseServerClient()
      : null;

    let supabaseUser: { id: string } | null = null;
    if (supabase) {
      logger?.log("DATABASE", "Authenticating user with Supabase");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        logger?.log("DATABASE", "Supabase auth error", {
          error: authError.message,
          code: authError.status,
        });
      } else {
        logger?.log("DATABASE", "User authenticated", {
          userId: user?.id ?? null,
        });
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

    if (supabaseUser && supabase) {
      if (!activeConversationId) {
        activeConversationId = generateConversationId();
        logger?.log("DATABASE", "Generated new conversation ID", {
          conversationId: activeConversationId,
        });
      }
      logger?.log("DATABASE", "Ensuring conversation exists", {
        conversationId: activeConversationId,
        userId: supabaseUser.id,
      });
      const result = await ensureConversation(
        supabase,
        supabaseUser,
        activeConversationId,
        latestUserMessage
      );
      activeConversationId = result.conversationId;
      conversationCreatedEvent = result.event;
      if (result.event) {
        logger?.log("DATABASE", "Conversation created", result.event);
      } else {
        logger?.log("DATABASE", "Conversation already exists", {
          conversationId: result.conversationId,
        });
      }
    } else if (!activeConversationId) {
      const newId = generateConversationId();
      activeConversationId = newId;
      const title = buildConversationTitle(latestUserMessage);
      const now = new Date().toISOString();
      conversationCreatedEvent = {
        type: "conversation_created",
        conversationId: newId,
        title,
        user_id: "",
        created_at: now,
        updated_at: now,
      };
      logger?.log(
        "LOCAL",
        "Created local conversation",
        conversationCreatedEvent
      );
    }

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: buildSystemPrompt(searchEnabled, systemInstruction),
      },
      ...toChatMessages(history),
    ];

    logger?.log("MODEL", "Using model", { model: requestedModel });

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
          userCreatedAt: null,
          assistantCreatedAt: null,
        };

        const sendToClient = (eventType: string, data: unknown) => {
          const eventData =
            typeof data === "object" && data !== null && !Array.isArray(data)
              ? { type: eventType, ...data }
              : { type: eventType, data };
          const line = `data: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(line));
          logger?.log("FRONTEND", `Sent SSE event: ${eventType}`, eventData);
        };

        if (conversationCreatedEvent) {
          sendToClient("conversation_created", conversationCreatedEvent);
        }

        // Authenticated users: pre-save latest user message so conversations never stay empty.
        if (supabaseUser && supabase && activeConversationId) {
          try {
            logger?.log("DATABASE", "Pre-saving user message", {
              conversationId: activeConversationId,
            });
            await saveMessages(
              supabase,
              activeConversationId,
              latestUserMessage,
              [],
              messageIds
            );
            logger?.log("DATABASE", "User message pre-saved", {
              userMessageId: messageIds.userMessageId,
            });
          } catch (error) {
            logger?.log(
              "DATABASE",
              "Failed to pre-save user message",
              error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error
            );
          }
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
            logger?.log("ITERATION", `Starting iteration ${iteration}`, {
              messageCount: currentMessages.length,
            });

            let stream: ReadableStream<Uint8Array>;
            try {
              const requestPayload = {
                model: requestedModel,
                messages: currentMessages,
                tools: tools.length > 0 ? tools : undefined,
              };
              logger?.log(
                "OPENROUTER",
                "Sending chat completion request",
                requestPayload
              );
              stream = await streamChatCompletion(requestPayload);
              logger?.log("OPENROUTER", "Chat completion stream started");
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to start chat completion";
              logger?.log("OPENROUTER", "Stream error", {
                error:
                  error instanceof Error
                    ? { message: error.message, stack: error.stack }
                    : error,
              });
              sendToClient("error", {
                message: `错误：${message}`,
              });
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
              logger?.log("OPENROUTER", "Received chunk", chunk);
              const delta = chunk?.choices?.[0]?.delta;
              const finishReason = chunk?.choices?.[0]?.finishReason as
                | string
                | undefined;

              if (delta?.reasoning) {
                currentReasoning += delta.reasoning;
                appendThinking(delta.reasoning);
                sendToClient("thinking", {
                  content: delta.reasoning,
                });
              }

              if (delta?.content) {
                assistantMessage += delta.content;
                sendToClient("content", {
                  content: delta.content,
                });
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
                logger?.log("OPENROUTER", "Stream finished with stop");
                finishedWithStop = true;
                break;
              }

              if (finishReason === "tool_calls" && toolCalls.length > 0) {
                logger?.log(
                  "OPENROUTER",
                  `Stream finished with tool_calls: ${toolCalls.length}`,
                  {
                    toolCalls: toolCalls.map((tc) => ({
                      name: tc.function.name,
                      id: tc.id,
                    })),
                  }
                );
                break;
              }
            }

            if (finishedWithStop) {
              logger?.log("OPENROUTER", "Conversation completed", {
                messageLength: assistantMessage.length,
              });
              finalAssistantMessage = assistantMessage;
              closeStream();
              break;
            }

            if (toolCalls.length === 0) {
              logger?.log("OPENROUTER", "No tool calls, ending conversation");
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

            // Authenticated users: save to Supabase
            if (supabaseUser && supabase && activeConversationId) {
              const partialAssistantBlocks = buildAssistantBlocks(
                researchItems,
                assistantMessage || null
              );
              logger?.log("DATABASE", "Saving partial assistant message", {
                conversationId: activeConversationId,
                blockCount: partialAssistantBlocks.length,
              });
              await saveMessages(
                supabase,
                activeConversationId,
                latestUserMessage,
                partialAssistantBlocks,
                messageIds
              );
              logger?.log("DATABASE", "Partial assistant message saved", {
                assistantMessageId: messageIds.assistantMessageId,
              });
            }

            // All users: send conversation_updated event
            if (activeConversationId) {
              const updatedEvent = {
                conversationId: activeConversationId,
                updated_at: new Date().toISOString(),
              };
              sendToClient("conversation_updated", updatedEvent);
            }

            logger?.log("TOOLS", `Executing ${toolCalls.length} tool calls`, {
              toolCalls: toolCalls.map((tc) => ({
                name: tc.function.name,
                id: tc.id,
              })),
            });
            const toolResults = await Promise.all(
              toolCalls.map(async (toolCall) => {
                if (toolCall.type !== "function") return null;

                const toolName = toolCall.function.name;
                let toolArgs: Record<string, unknown> = {};
                try {
                  const parsed = JSON.parse(
                    toolCall.function.arguments || "{}"
                  );
                  if (parsed && typeof parsed === "object") {
                    toolArgs = parsed as Record<string, unknown>;
                  }
                  logger?.log(
                    "TOOLS",
                    `Parsed tool arguments for ${toolName}`,
                    {
                      toolName,
                      args: toolArgs,
                    }
                  );
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : String(error);
                  logger?.log(
                    "TOOLS",
                    `Failed to parse tool arguments for ${toolName}`,
                    {
                      toolName,
                      error: message,
                      rawArguments: toolCall.function.arguments,
                    }
                  );
                  sendToClient("error", {
                    message: `工具参数解析失败(${toolName})，已使用空参数。`,
                  });
                  appendToolProgress(toolName, {
                    stage: "parse_error",
                    message,
                  });
                }

                logger?.log("TOOLS", `Calling tool: ${toolName}`, {
                  toolName,
                  args: toolArgs,
                });

                sendToClient("tool_call", {
                  tool: toolName,
                  args: toolArgs,
                });
                ensureToolItem(toolName, toolArgs);

                const result = await callToolByName(
                  toolName,
                  toolArgs,
                  (progress: ToolProgressUpdate) => {
                    logger?.log("TOOLS", `Tool progress: ${toolName}`, {
                      toolName,
                      stage: progress.stage,
                      message: progress.message,
                      receivedBytes: progress.receivedBytes,
                      totalBytes: progress.totalBytes,
                    });
                    sendToClient("tool_progress", {
                      tool: toolName,
                      ...progress,
                    });
                    appendToolProgress(toolName, {
                      stage: progress.stage,
                      message: String(progress.message ?? ""),
                      receivedBytes: progress.receivedBytes,
                      totalBytes: progress.totalBytes,
                    });
                  }
                );

                logger?.log("TOOLS", `Tool completed: ${toolName}`, {
                  toolName,
                  resultLength:
                    typeof result === "string"
                      ? result.length
                      : JSON.stringify(result).length,
                  resultPreview:
                    typeof result === "string"
                      ? result.substring(0, 200)
                      : JSON.stringify(result).substring(0, 200),
                });
                sendToClient("tool_result", {
                  tool: toolName,
                  result: result,
                });

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
            logger?.log("ITERATION", "Max iterations reached", {
              maxIterations,
              iteration,
            });
            sendToClient("error", {
              message: "[已达到最大工具调用次数限制]",
            });
            finalAssistantMessage =
              finalAssistantMessage ?? "\n\n[已达到最大工具调用次数限制]";
            closeStream();
          }

          const assistantBlocks = buildAssistantBlocks(
            researchItems,
            finalAssistantMessage
          );

          // Authenticated users: save to Supabase
          if (supabaseUser && supabase && activeConversationId) {
            logger?.log("DATABASE", "Saving final assistant message", {
              conversationId: activeConversationId,
              blockCount: assistantBlocks.length,
            });
            await saveMessages(
              supabase,
              activeConversationId,
              latestUserMessage,
              assistantBlocks,
              messageIds
            );
            logger?.log("DATABASE", "Final assistant message saved", {
              assistantMessageId: messageIds.assistantMessageId,
            });
          }

          // All users: send conversation_updated event
          if (activeConversationId && !streamClosed) {
            const updatedEvent = {
              conversationId: activeConversationId,
              updated_at: new Date().toISOString(),
            };
            sendToClient("conversation_updated", updatedEvent);
          }

          closeStream();
        } catch (error) {
          logger?.log("ERROR", "Stream processing error", {
            error:
              error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error,
          });
          if (!streamClosed) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            try {
              sendToClient("error", {
                message: `错误：${errorMessage}`,
              });
            } catch (enqueueError) {
              logger?.log("ERROR", "Failed to enqueue error message", {
                error:
                  enqueueError instanceof Error
                    ? {
                        message: enqueueError.message,
                        stack: enqueueError.stack,
                      }
                    : enqueueError,
              });
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
      logger.log("ERROR", "Top-level error", {
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      });
    } else {
      // console.error("[Chat-API] Top-level error:", error);
    }
    return NextResponse.json(
      { reply: "Unable to process request" },
      { status: 500 }
    );
  }
}
