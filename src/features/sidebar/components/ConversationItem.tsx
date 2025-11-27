"use client";

import type { Conversation } from "@/types/conversation";

type ConversationItemProps = {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return sameDay
    ? date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
      });
};

export function ConversationItem({
  conversation,
  isActive,
  onClick,
}: ConversationItemProps) {
  const title = conversation.title || "未命名会话";
  const timeLabel = conversation.updated_at
    ? formatTime(conversation.updated_at)
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-all hover:border-(--border-subtle) hover:bg-(--surface-hover) ${
        isActive ? "border-(--border-subtle) bg-(--surface-card)" : ""
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-muted) text-sm font-semibold text-foreground">
        {title.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {title}
        </div>
        <div className="mt-0.5 text-[11px] text-(--text-tertiary)">
          {timeLabel || "刚刚更新"}
        </div>
      </div>
    </button>
  );
}
