"use client";

import Link from "next/link";
import type { Conversation } from "@/types/conversation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

type ConversationItemProps = {
  conversation: Conversation;
  isActive: boolean;
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
}: ConversationItemProps) {
  const title = conversation.title || "未命名会话";
  const timeLabel = conversation.updated_at
    ? formatTime(conversation.updated_at)
    : "";

  const pending = useChatStore((state) => state.pending);
  const stop = useChatStore((state) => state.stop);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 如果是修饰键点击（Ctrl/Cmd/Shift/Alt），用户意图是新标签/新窗口/下载等
    // 直接放行，不弹确认，不调用 stop()
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    // 如果正在生成，需要确认
    if (pending) {
      const confirmed = window.confirm(
        "AI正在生成内容，离开当前对话可能会丢失正在生成的内容，确定要离开吗？"
      );
      if (!confirmed) {
        e.preventDefault();
        return;
      }
    }

    // 停止当前生成，让 Link 自己完成导航
    stop();
  };

  return (
    <Link
      href={`/app/c/${conversation.id}`}
      onClick={handleClick}
      className={`flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-all hover:border-(--border-subtle) hover:bg-(--surface-hover) ${
        isActive ? "border-(--border-subtle) bg-(--surface-card)" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {title}
        </div>
        <div className="mt-0.5 text-[11px] text-(--text-tertiary)">
          {timeLabel || "刚刚更新"}
        </div>
      </div>
    </Link>
  );
}
