export type ModelConfig = {
  id: string;
  label: string;
};

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "x-ai/grok-4.1-fast",
    label: "grok-4.1-fast",
  },
  {
    id: "google/gemini-3-flash-preview",
    label: "gemini-3-flash-preview",
  },
  {
    id: "deepseek/deepseek-v3.2",
    label: "deepseek-v3.2",
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    label: "claude-sonnet-4.5",
  },
  {
    id: "openai/gpt-5.1-codex-mini",
    label: "gpt-5.1-codex-mini",
  },
];

const modelConfigMap = new Map<string, ModelConfig>(
  MODEL_CONFIGS.map((config) => [config.id, config])
);

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelConfigMap.get(modelId);
}
