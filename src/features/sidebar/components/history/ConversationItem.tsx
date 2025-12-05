"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import type { Conversation } from "@/types/conversation";
import { fetchConversationMessages } from "@/src/features/chat/lib/api";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import type { Message } from "@/src/features/chat/types/chat";

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
  const router = useRouter();
  const title = conversation.title || "未命名会话";
  const timeLabel = conversation.updated_at
    ? formatTime(conversation.updated_at)
    : "";

  const messagesRef = useRef<Message[] | null>(null);
  const fetchPromiseRef = useRef<Promise<Message[]> | null>(null);
  const setMessages = useChatStore((state) => state.setMessages);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const fetchConversation = useChatStore((state) => state.fetchConversation);
  const setFetchLoading = useChatStore((state) => state.setFetchLoading);
  const pending = useChatStore((state) => state.pending);

  const prefetchMessages = () => {
    if (messagesRef.current || fetchPromiseRef.current) {
      return;
    }

    fetchPromiseRef.current = fetchConversationMessages(conversation.id)
      .then((messages) => {
        messagesRef.current = messages;
        return messages;
      })
      .catch((error) => {
        console.error("Prefetch failed:", error);
        fetchPromiseRef.current = null;
        throw error;
      });
  };

  const handleClick = async () => {
    if (isActive) return;

    if (pending) {
      const confirmed = window.confirm(
        "AI正在生成内容，离开当前对话可能会丢失正在生成的内容，确定要离开吗？"
      );
      if (!confirmed) {
        return;
      }
    }

    // If we have prefetched data, use it immediately
    if (messagesRef.current) {
      setMessages(messagesRef.current);
      setConversationId(conversation.id);
      setFetchLoading(false);
      router.push(`/c/${conversation.id}`);
      return;
    }

    // If prefetch is in progress, wait for it
    if (fetchPromiseRef.current) {
      setFetchLoading(true);
      try {
        const messages = await fetchPromiseRef.current;
        setMessages(messages);
        setConversationId(conversation.id);
        setFetchLoading(false);
        router.push(`/c/${conversation.id}`);
        return;
      } catch {
        setFetchLoading(false);
        // If prefetch fails, fall through to use fetchConversation
      }
    }

    // Otherwise, use store's fetchConversation method
    try {
      await fetchConversation(conversation.id);
      router.push(`/c/${conversation.id}`);
    } catch {
      // If fetch fails, navigate anyway (page will handle error)
      router.push(`/c/${conversation.id}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={prefetchMessages}
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
    </button>
  );
}
