export const TOOL_RESULT_CHAR_LIMIT = 1500;

export function truncateToolResult(value: string): string {
  if (value.length <= TOOL_RESULT_CHAR_LIMIT) {
    return value;
  }
  return `${value.slice(0, TOOL_RESULT_CHAR_LIMIT)}…`;
}

export function prettyPrintArgs(args: Record<string, unknown>): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return "{}";
  }
}

// 对话标题生成逻辑，供本地/云端统一使用
import type { MessageLike } from "@/src/features/chat/types/chat";

export const buildConversationTitle = (message: MessageLike) => {
  const text = message.blocks
    .filter((b) => b.type === "content")
    .map((b) => b.content)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "新会话";
  }

  const normalized = text.replace(/\r?\n/g, " ").trim();
  return normalized;
};
