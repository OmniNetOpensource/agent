import { NextResponse } from "next/server";
import { callToolByName, toolSpecs } from "@/src/shared/lib/tools";
import {
  isSupportedChatModel,
  streamChatCompletion,
  parseSSEStream,
} from "@/src/shared/lib/openrouter/server";
import { streamAnthropicCompletion } from "@/src/shared/lib/anthropic/server";
import {
  convertToAnthropicMessages,
  convertToolsToAnthropic,
  type AnthropicMessage,
} from "@/src/shared/lib/anthropic/converter";
import type {
  ResearchItem,
  SerializedMessage,
  ToolProgress,
} from "@/src/features/chat/types/chat";
import type { ToolProgressUpdate } from "@/src/shared/lib/tools/types";
import type { ChatRequest } from "@/src/features/chat/types/chat";
import {
  buildSystemPrompt,
  ChatMessage,
  ReasoningDetail,
  StreamToolCall,
  toChatMessages,
} from "./utils";
import {
  ConversationLogger,
  createConversationLogger,
} from "@/src/shared/lib/conversation-logger";

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
      provider,
      searchEnabled,
      systemInstruction,
      backend,
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

    // Disable tools if user explicitly disabled search
    const tools = searchEnabled === false ? [] : toolSpecs;

    logger?.log(
      "TOOLS",
      `Tools loaded: ${tools.length}`,
      tools.map(
        (tool) =>
          (tool as { type: "function"; function: { name: string } }).function
            .name
      )
    );

    let activeConversationId = conversationId ?? null;
    let conversationCreatedEvent: {
      type: "conversation_created";
      conversationId: string;
      title: string;
      user_id: string;
      created_at: string;
      updated_at: string;
    } | null = null;

    const history: SerializedMessage[] = conversationHistory.map((message) => ({
      ...message,
      blocks: Array.isArray(message.blocks) ? message.blocks : [],
    }));

    if (!activeConversationId) {
      const newId = generateConversationId();
      activeConversationId = newId;
      const title = "New Chat";
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
        let streamClosed = false;

        const sendToClient = (eventType: string, data: unknown) => {
          const eventData =
            typeof data === "object" && data !== null && !Array.isArray(data)
              ? { type: eventType, ...data }
              : { type: eventType, data };
          const line = `data: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(line));
          // 创建用于日志的 eventData，移除 tool_result 的 result 字段
          const logEventData =
            eventType === "tool_result" &&
            typeof eventData === "object" &&
            eventData !== null &&
            "result" in eventData
              ? (() => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { result: _result, ...rest } = eventData as { result?: unknown };
                  return rest;
                })()
              : eventData;
          logger?.log("FRONTEND", `Sent SSE event: ${eventType}`, logEventData);
        };

        if (conversationCreatedEvent) {
          sendToClient("conversation_created", conversationCreatedEvent);
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

        const executeToolCalls = async (
          toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>
        ) => {
          return Promise.all(
            toolCalls.map(async (tc) => {
              logger?.log("TOOLS", `Calling tool: ${tc.name}`, { toolName: tc.name, args: tc.args });
              sendToClient("tool_call", { tool: tc.name, args: tc.args });
              ensureToolItem(tc.name, tc.args);

              const result = await callToolByName(tc.name, tc.args, (progress: ToolProgressUpdate) => {
                sendToClient("tool_progress", { tool: tc.name, ...progress });
                appendToolProgress(tc.name, {
                  stage: progress.stage,
                  message: String(progress.message ?? ""),
                  receivedBytes: progress.receivedBytes,
                  totalBytes: progress.totalBytes,
                });
              });

              const normalizedResult = typeof result === "string" ? result : JSON.stringify(result);
              sendToClient("tool_result", { tool: tc.name, result });
              appendToolResult(tc.name, normalizedResult);

              return { id: tc.id, name: tc.name, result: normalizedResult };
            })
          );
        };

        try {
          // Anthropic backend handling
          if (backend === "anthropic") {
            // const systemPrompt = buildSystemPrompt(searchEnabled, systemInstruction);
            let anthropicMessages: AnthropicMessage[] = convertToAnthropicMessages(history);
            const anthropicTools = tools.length > 0 ? convertToolsToAnthropic(tools) : undefined;

            while (iteration < maxIterations) {
              iteration++;
              logger?.log("ITERATION", `Starting Anthropic iteration ${iteration}`);

              let assistantText = "";
              const pendingToolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = [];
              let currentToolId = "";
              let currentToolName = "";
              let currentToolJson = "";
              let stopReason = "";

              try {
                for await (const chunk of streamAnthropicCompletion({
                  model: requestedModel,
                  messages: anthropicMessages,
                  // system: systemPrompt,
                  tools: anthropicTools,
                })) {
                  if (chunk.type === "text") {
                    assistantText += chunk.text;
                    sendToClient("content", { content: chunk.text });
                  } else if (chunk.type === "thinking") {
                    appendThinking(chunk.thinking);
                    sendToClient("thinking", { content: chunk.thinking });
                  } else if (chunk.type === "tool_use_start") {
                    currentToolId = chunk.id;
                    currentToolName = chunk.name;
                    currentToolJson = "";
                  } else if (chunk.type === "tool_use_delta") {
                    currentToolJson += chunk.partial_json;
                  } else if (chunk.type === "stop") {
                    stopReason = chunk.stop_reason;
                    if (currentToolId && currentToolName) {
                      let args: Record<string, unknown> = {};
                      try {
                        args = JSON.parse(currentToolJson || "{}");
                      } catch {}
                      pendingToolCalls.push({ id: currentToolId, name: currentToolName, args });
                    }
                  }
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to start Anthropic completion";
                sendToClient("error", { message: `错误：${message}` });
                closeStream();
                break;
              }

              if (stopReason === "end_turn" || pendingToolCalls.length === 0) {
                closeStream();
                break;
              }

              // Execute tool calls
              const toolResults = await executeToolCalls(pendingToolCalls);

              // Build next messages for Anthropic
              const assistantContent: Array<{ type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }> = [];
              if (assistantText) {
                assistantContent.push({ type: "text", text: assistantText });
              }
              for (const tc of pendingToolCalls) {
                assistantContent.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.args });
              }

              const toolResultContent: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = toolResults.map((tr) => ({
                type: "tool_result",
                tool_use_id: tr.id,
                content: tr.result,
              }));

              anthropicMessages = [
                ...anthropicMessages,
                { role: "assistant", content: assistantContent },
                { role: "user", content: toolResultContent as AnthropicMessage["content"] },
              ];

              if (activeConversationId) {
                sendToClient("conversation_updated", { conversationId: activeConversationId, updated_at: new Date().toISOString() });
              }
            }

            if (iteration >= maxIterations && !streamClosed) {
              sendToClient("error", { message: "[已达到最大工具调用次数限制]" });
              closeStream();
            }

            if (activeConversationId && !streamClosed) {
              sendToClient("conversation_updated", { conversationId: activeConversationId, updated_at: new Date().toISOString() });
            }

            closeStream();
            return;
          }

          // Tool calling rules (OpenRouter/OpenAI-compatible):
          // - Assistant must return tool_calls, then we append role=tool results with matching tool_call_id,
          //   and resend the full history including that assistant message.
          // Gemini-specific rule (thinking/reasoning variants):
          // - Preserve reasoning_details from the assistant tool-call turn exactly, and send them back
          //   on the next request (Gemini uses these as thought signatures).
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
                provider,
              };
              // 创建用于日志的 payload，移除 tool 消息的 content
              const logPayload = {
                ...requestPayload,
                messages: requestPayload.messages.map((msg) => {
                  if (msg.role === "tool") {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { content: _content, ...rest } = msg;
                    return rest;
                  }
                  return msg;
                }),
              };
              logger?.log(
                "OPENROUTER",
                "Sending chat completion request",
                logPayload
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
            let currentReasoningDetails: ReasoningDetail[] = [];
            const toolCalls: Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }> = [];
            let currentToolCallIndex = -1;
            let finishedWithStop = false;

            const mergeReasoningDetail = (detail: ReasoningDetail) => {
              const detailIndex =
                typeof detail.index === "number" ? detail.index : null;

              if (detailIndex === null) {
                currentReasoningDetails = [...currentReasoningDetails, detail];
                return;
              }

              const existingIndex = currentReasoningDetails.findIndex(
                (item) => item.index === detailIndex
              );
              if (existingIndex === -1) {
                currentReasoningDetails = [...currentReasoningDetails, detail];
                return;
              }

              const existing = currentReasoningDetails[existingIndex];
              const mergedText =
                typeof existing.text === "string" ||
                typeof detail.text === "string"
                  ? `${existing.text ?? ""}${detail.text ?? ""}`
                  : existing.text;
              const merged = { ...existing, ...detail, text: mergedText };
              currentReasoningDetails = [
                ...currentReasoningDetails.slice(0, existingIndex),
                merged,
                ...currentReasoningDetails.slice(existingIndex + 1),
              ];
            };

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

              if (delta?.reasoning_details) {
                for (const detail of delta.reasoning_details) {
                  if (detail && typeof detail === "object") {
                    mergeReasoningDetail(detail);
                  }
                }
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
              closeStream();
              break;
            }

            if (toolCalls.length === 0) {
              logger?.log("OPENROUTER", "No tool calls, ending conversation");
              closeStream();
              break;
            }

            currentMessages.push({
              role: "assistant",
              content: assistantMessage || null,
              toolCalls,
              reasoning: currentReasoning || undefined,
              reasoningDetails:
                currentReasoningDetails.length > 0
                  ? currentReasoningDetails
                  : undefined,
            });

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
            closeStream();
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
