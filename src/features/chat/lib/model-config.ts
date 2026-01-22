type ProviderPreferences = {
  order: string[];
};

export type Backend = "openrouter" | "anthropic" | "openai";

export type ModelConfig = {
  id: string;
  label: string;
  provider?: ProviderPreferences;
  backend?: Backend;
};

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "claude-opus-4-5-20251101",
    label: "claude-opus-4.5",
    backend: "anthropic",
  },
  {
    id: "google/gemini-3-flash-preview",
    label: "gemini-3-flash-preview",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "claude-haiku-4.5",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "gpt-oss-120b",
    provider: {
      order: ["Cerebras"],
    },
  },
  {
    id: "xiaomi/mimo-v2-flash:free",
    label: "mimo-v2-flash",
  },
  {
    id: "gpt-5.2",
    label: "gpt-5.2",
    backend: "openai",
  },
  {
    id: "gpt-5.2-codex",
    label: "gpt-5.2-codex",
    backend: "openai",
  },
];

const modelConfigMap = new Map<string, ModelConfig>(
  MODEL_CONFIGS.map((config) => [config.id, config])
);

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelConfigMap.get(modelId);
}
