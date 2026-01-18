import { OpenRouter } from "@openrouter/sdk";
import type { ChatMessage, ReasoningDetail } from "@/src/app/api/chat/utils";
import type { StreamToolCall } from "@/src/app/api/chat/utils";

export function isSupportedChatModel(
  value: string | undefined | null
): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function getOpenRouterHeaders() {
  const headers: Record<string, string> = {};
  if (process.env.OPENROUTER_HTTP_REFERER) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER;
  }
  if (process.env.OPENROUTER_X_TITLE) {
    headers["X-Title"] = process.env.OPENROUTER_X_TITLE;
  }
  return headers;
}

export function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  return new OpenRouter({
    apiKey,
    serverURL: OPENROUTER_BASE_URL,
  });
}

export type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning?: string;
      reasoning_details?: ReasoningDetail[];
      tool_calls?: StreamToolCall[];
    };
    finishReason?: string | null;
  }>;
};

function supportsReasoning(model: string): boolean {
  // Gemini models support reasoning/thinking
  return model.startsWith("google/gemini");
}

export async function streamChatCompletion(params: {
  model: string;
  messages: ChatMessage[];
  tools?: unknown[];
}): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  // 转换消息格式以符合 OpenAI API 标准 (驼峰 -> 下划线)
  const messages = params.messages.map((msg) => {
    const { toolCalls, toolCallId, reasoningDetails, ...rest } = msg;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newMsg: any = { ...rest };

    if (toolCalls) {
      newMsg.tool_calls = toolCalls.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: tc.function,
      }));
    }

    if (toolCallId) {
      newMsg.tool_call_id = toolCallId;
    }

    if (reasoningDetails) {
      newMsg.reasoning_details = reasoningDetails;
    }

    return newMsg;
  });

  // 构建请求体
  const requestBody: Record<string, unknown> = {
    model: params.model,
    messages,
    stream: true,
  };

  if (params.tools && params.tools.length > 0) {
    requestBody.tools = params.tools;
  }

  // 为支持思考的模型启用思考能力（设置为 high）
  if (supportsReasoning(params.model)) {
    requestBody.extra_body = {
      reasoning: {
        effort: "high",
        enabled: true,
      },
    };
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...getOpenRouterHeaders(),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok || !response.body) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }
  return response.body;
}

export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<StreamChunk> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            yield JSON.parse(line.slice(6));
          } catch (e) {
            // Skip invalid JSON lines
            console.error("Failed to parse SSE line:", line, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
