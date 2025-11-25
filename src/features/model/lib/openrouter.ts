import { OpenRouter } from "@openrouter/sdk";

export type ChatModelId = string;

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "x-ai/grok-4.1-fast";

export function isSupportedChatModel(
  value: string | undefined | null
): value is ChatModelId {
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

export async function fetchOpenRouterModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const client = getOpenRouterClient();

  try {
    const response = await client.models.list(undefined, {
      headers: getOpenRouterHeaders(),
    });
    const models = response.data ?? [];
    return models.map((model) => ({
      id: model.id,
      label: model.name ?? model.id,
    }));
  } catch (error) {
    // SDK 抛出的错误结构已包含状态码和消息，这里统一转成可观察的错误
    const message =
      error instanceof Error ? error.message : "Failed to fetch models";
    throw new Error(`OpenRouter models request failed: ${message}`);
  }
}
