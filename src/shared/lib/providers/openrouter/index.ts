import { BaseProvider } from "../base-provider";
import type { StreamEvent, IterationResult, ToolCallResult, PendingToolCall } from "../types";
import {
  streamChatCompletion,
  parseSSEStream,
} from "@/src/shared/lib/openrouter/server";
import { buildSystemPrompt, toChatMessages, type ChatMessage, type ReasoningDetail, type StreamToolCall } from "@/src/app/api/chat/utils";
import { supportsImageGeneration } from "@/src/features/chat/lib/model-config";

export class OpenRouterProvider extends BaseProvider {
  readonly name = "openrouter" as const;

  private currentMessages: ChatMessage[] = [];

  protected onInitialize(): void {
    const systemPrompt = buildSystemPrompt(this.config.searchEnabled, this.config.systemInstruction);
    this.currentMessages = [
      { role: "system", content: systemPrompt },
      ...toChatMessages(this.context.conversationHistory),
    ];
  }

  async *runIteration(): AsyncGenerator<StreamEvent, IterationResult, undefined> {
    this.ensureInitialized();

    const isImageModel = supportsImageGeneration(this.config.model);

    this.context.logger?.log("ITERATION", "Starting OpenRouter iteration", {
      messageCount: this.currentMessages.length,
      isImageModel,
    });

    let stream: ReadableStream<Uint8Array>;
    try {
      const requestPayload = {
        model: this.config.model,
        messages: this.currentMessages,
        tools: isImageModel ? undefined : (this.config.tools.length > 0 ? this.config.tools : undefined),
        provider: this.config.provider,
        modalities: isImageModel ? ["text", "image"] as ("text" | "image")[] : undefined,
      };
      // Create log payload, removing tool message content
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
      this.context.logger?.log("OPENROUTER", "Sending chat completion request", logPayload);
      stream = await streamChatCompletion(requestPayload);
      this.context.logger?.log("OPENROUTER", "Chat completion stream started");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start chat completion";
      this.context.logger?.log("OPENROUTER", "Stream error", {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      yield { type: "error", message: `错误：${message}` };
      return { shouldContinue: false, pendingToolCalls: [], assistantText: "" };
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
      const detailIndex = typeof detail.index === "number" ? detail.index : null;

      if (detailIndex === null) {
        currentReasoningDetails = [...currentReasoningDetails, detail];
        return;
      }

      const existingIndex = currentReasoningDetails.findIndex((item) => item.index === detailIndex);
      if (existingIndex === -1) {
        currentReasoningDetails = [...currentReasoningDetails, detail];
        return;
      }

      const existing = currentReasoningDetails[existingIndex];
      const mergedText =
        typeof existing.text === "string" || typeof detail.text === "string"
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
      this.context.logger?.log("OPENROUTER", "Received chunk", chunk);
      const delta = chunk?.choices?.[0]?.delta;
      const message = chunk?.choices?.[0]?.message;
      const finishReason = chunk?.choices?.[0]?.finishReason as string | undefined;

      // Handle generated images from message (non-streaming response)
      const images = message?.images;
      if (images?.length) {
        for (const image of images) {
          const imageId = `img_${Date.now()}_${Math.random().toString(16).slice(2)}`;
          yield {
            type: "generated_image",
            id: imageId,
            url: image.image_url.url,
          };
        }
      }

      if (delta?.reasoning) {
        currentReasoning += delta.reasoning;
        yield { type: "thinking", content: delta.reasoning };
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
        yield { type: "content", content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls as StreamToolCall[]) {
          if (toolCall.index !== undefined && toolCall.index !== currentToolCallIndex) {
            currentToolCallIndex = toolCall.index;
            toolCalls[currentToolCallIndex] = {
              id: toolCall.id || "",
              type: "function",
              function: {
                name: toolCall.function?.name || "",
                arguments: toolCall.function?.arguments || "",
              },
            };
          } else if (currentToolCallIndex >= 0 && toolCall.function?.arguments) {
            const currentToolCall = toolCalls[currentToolCallIndex];
            if (currentToolCall && currentToolCall.type === "function") {
              currentToolCall.function.arguments += toolCall.function.arguments;
            }
          }
        }
      }

      if (finishReason === "stop") {
        this.context.logger?.log("OPENROUTER", "Stream finished with stop");
        finishedWithStop = true;
        break;
      }

      if (finishReason === "tool_calls" && toolCalls.length > 0) {
        this.context.logger?.log("OPENROUTER", `Stream finished with tool_calls: ${toolCalls.length}`, {
          toolCalls: toolCalls.map((tc) => ({ name: tc.function.name, id: tc.id })),
        });
        break;
      }
    }

    if (finishedWithStop) {
      this.context.logger?.log("OPENROUTER", "Conversation completed", {
        messageLength: assistantMessage.length,
      });
      return { shouldContinue: false, pendingToolCalls: [], assistantText: assistantMessage };
    }

    if (toolCalls.length === 0) {
      this.context.logger?.log("OPENROUTER", "No tool calls, ending conversation");
      return { shouldContinue: false, pendingToolCalls: [], assistantText: assistantMessage };
    }

    // Store assistant message with tool calls for next iteration
    this.currentMessages.push({
      role: "assistant",
      content: assistantMessage || null,
      toolCalls,
      reasoning: currentReasoning || undefined,
      reasoningDetails: currentReasoningDetails.length > 0 ? currentReasoningDetails : undefined,
    });

    // Convert tool calls to pending format
    const pendingToolCalls: PendingToolCall[] = toolCalls.map((tc) => {
      let args: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(tc.function.arguments || "{}");
        if (parsed && typeof parsed === "object") {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        // Use empty args on parse failure
      }
      return { id: tc.id, name: tc.function.name, args };
    });

    return { shouldContinue: true, pendingToolCalls, assistantText: assistantMessage };
  }

  appendToolResults(results: ToolCallResult[]): void {
    this.ensureInitialized();
    for (const result of results) {
      this.currentMessages.push({
        role: "tool",
        toolCallId: result.id,
        content: result.result,
      });
    }
  }
}
