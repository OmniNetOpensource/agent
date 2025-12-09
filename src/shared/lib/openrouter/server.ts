import { OpenRouter } from "@openrouter/sdk";

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

