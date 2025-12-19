export type ModelConfig = {
  id: string;
  label: string;
};

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "x-ai/grok-4.1-fast",
    label: "轻舟",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "博学",
  },
  {
    id: "deepseek/deepseek-v3.2",
    label: "中国做题家",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "娴雅",
  },
  {
    id: "openai/gpt-5.1-codex-mini",
    label: "普通人",
  },
];

const modelConfigMap = new Map<string, ModelConfig>(
  MODEL_CONFIGS.map((config) => [config.id, config])
);

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelConfigMap.get(modelId);
}
