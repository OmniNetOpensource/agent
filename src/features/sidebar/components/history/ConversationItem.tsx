"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import type { Conversation } from "@/types/conversation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";

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
  const isPinned = Boolean(conversation.pinned);

  const pending = useChatStore((state) => state.pending);
  const stop = useChatStore((state) => state.stop);
  const router = useRouter();
  const pinConversation = useConversationsStore(
    (state) => state.pinConversation
  );
  const unpinConversation = useConversationsStore(
    (state) => state.unpinConversation
  );
  const deleteConversation = useConversationsStore(
    (state) => state.deleteConversation
  );

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

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "确定要删除这个会话吗？删除后无法恢复。"
    );
    if (!confirmed) {
      return;
    }

    await deleteConversation(conversation.id);

    if (isActive) {
      router.push("/app");
    }
  };

  return (
    <div
      className={`group relative flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-all hover:border-(--border-subtle) hover:bg-(--surface-hover) ${
        isActive ? "border-(--border-subtle) bg-(--surface-card)" : ""
      }`}
    >
      <Link
        href={`/app/c/${conversation.id}`}
        onClick={handleClick}
        className="absolute inset-0 z-0"
        aria-label={title}
      />
      <div className="min-w-0 flex-1 pointer-events-none relative z-10">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {title}
          </span>
          {isPinned ? (
            <Pin className="size-3.5 text-(--text-tertiary)" />
          ) : null}
        </div>
        <div className="mt-0.5 text-[11px] text-(--text-tertiary)">
          {timeLabel || "刚刚更新"}
        </div>
      </div>
      <div className="relative z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={handleMenuClick}
              aria-label="会话操作"
              className="flex size-7 items-center justify-center rounded-lg text-(--text-tertiary) opacity-0 transition-opacity hover:bg-(--surface-hover) hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="right"
            className="min-w-[8.5rem]"
            onClick={(e) => e.stopPropagation()}
          >
            {isPinned ? (
              <DropdownMenuItem
                onSelect={() => {
                  void unpinConversation(conversation.id);
                }}
              >
                <PinOff className="size-4" />
                取消置顶
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() => {
                  void pinConversation(conversation.id);
                }}
              >
                <Pin className="size-4" />
                置顶会话
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                void handleDelete();
              }}
              className="text-destructive"
            >
              <Trash2 className="size-4" />
              删除会话
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
