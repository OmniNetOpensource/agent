export const chatModels = [
  {
    id: "kimi-k2-thinking-turbo",
    label: "Kimi K2 Thinking",
  },
] as const;

export type ChatModelId = (typeof chatModels)[number]["id"];

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = chatModels[0].id;

export function isSupportedChatModel(
  value: string | undefined | null
): value is ChatModelId {
  if (!value) {
    return false;
  }
  return chatModels.some((model) => model.id === value);
}
