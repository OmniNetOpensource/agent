export type ModelConfig = {
  id: string;
  label: string;
};

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "google/gemini-3-flash-preview",
    label: "gemini-3-flash-preview",
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    label: "claude-sonnet-4.5",
  },
];

const modelConfigMap = new Map<string, ModelConfig>(
  MODEL_CONFIGS.map((config) => [config.id, config])
);

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelConfigMap.get(modelId);
}
