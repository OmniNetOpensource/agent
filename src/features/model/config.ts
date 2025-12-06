import { ChatModelId } from "./lib/openrouter";

export type ModelPermission = {
  canUpload: boolean;
  canSearch: boolean;
};

export type ModelConfig = {
  id: ChatModelId;
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
    id: "google/gemini-3-pro-preview",
    label: "博学",
    permissions: {
      canUpload: true,
      canSearch: false,
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
    id: "anthropic/claude-opus-4.5",
    label: "娴雅",
    permissions: {
      canUpload: true,
      canSearch: true,
    },
  },
];

const modelConfigMap = new Map<ChatModelId, ModelConfig>(
  MODEL_CONFIGS.map((config) => [config.id, config])
);

export function getModelConfig(modelId: ChatModelId): ModelConfig | undefined {
  return modelConfigMap.get(modelId);
}

export function getModelPermissions(
  modelId: ChatModelId
): ModelPermission | undefined {
  const config = getModelConfig(modelId);
  return config?.permissions;
}

