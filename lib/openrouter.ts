import OpenAI from "openai";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function getOpenRouterHeaders() {
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

  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: getOpenRouterHeaders(),
  });
}

type OpenRouterModelsResponse = {
  data?: Array<{
    id: string;
    name?: string;
    description?: string;
    context_length?: number;
    pricing?: Record<string, unknown>;
  }>;
};

export async function fetchOpenRouterModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...getOpenRouterHeaders(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenRouter models request failed: ${response.status} ${text}`
    );
  }

  const json = (await response.json()) as OpenRouterModelsResponse;
  const models = json.data ?? [];

  return models.map((model) => ({
    id: model.id,
    label: model.name ?? model.id,
  }));
}
