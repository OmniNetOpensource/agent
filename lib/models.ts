export type ChatModelId = string;

export const DEFAULT_CHAT_MODEL_ID: ChatModelId =
  process.env.OPENROUTER_DEFAULT_MODEL || "openrouter/auto";

export function isSupportedChatModel(
  value: string | undefined | null
): value is ChatModelId {
  return typeof value === "string" && value.trim().length > 0;
}
