type ProviderPreferences = {
  order: string[];
};

export type Backend = "openrouter" | "anthropic" | "openai";

export type ModelCapabilities = {
  imageGeneration?: boolean;
};

export type ModelConfig = {
  id: string;
  label: string;
  provider?: ProviderPreferences;
  backend?: Backend;
  capabilities?: ModelCapabilities;
};

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "claude-opus-4-5-20251101",
    label: "think",
    backend: "anthropic",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "flash",
    provider: {
      order: ["Cerebras"],
    },
  },
];

const modelConfigMap = new Map<string, ModelConfig>(
  MODEL_CONFIGS.map((config) => [config.id, config])
);

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelConfigMap.get(modelId);
}

export function supportsImageGeneration(modelId: string): boolean {
  const config = modelConfigMap.get(modelId);
  return config?.capabilities?.imageGeneration === true;
}
