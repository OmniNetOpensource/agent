export type ModelPermission = {
  canUpload: boolean;
  canSearch: boolean;
};

export type ModelConfig = {
  id: string;
  label: string;
  permissions: ModelPermission;
};

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "x-ai/grok-4.1-fast",
    label: "轻舟",
    permissions: {
      canUpload: true,
      canSearch: true,
    },
  },
  {
    id: "google/gemini-2.5-flash",
    label: "博学",
    permissions: {
      canUpload: true,
      canSearch: true,
    },
  },
  {
    id: "deepseek/deepseek-v3.2",
    label: "中国做题家",
    permissions: {
      canUpload: false,
      canSearch: true,
    },
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "娴雅",
    permissions: {
      canUpload: true,
      canSearch: true,
    },
  },
  {
    id: "openai/gpt-5.1-codex-mini",
    label: "普通人",
    permissions: {
      canUpload: true,
      canSearch: true,
    },
  },
];

const modelConfigMap = new Map<string, ModelConfig>(
  MODEL_CONFIGS.map((config) => [config.id, config])
);

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelConfigMap.get(modelId);
}

export function getModelPermissions(
  modelId: string
): ModelPermission | undefined {
  const config = getModelConfig(modelId);
  return config?.permissions;
}

