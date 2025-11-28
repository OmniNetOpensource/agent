"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";
import { ConversationItem } from "./ConversationItem";

export function ConversationList() {
  const router = useRouter();
  const conversations = useConversationsStore((state) => state.conversations);
  const conversationsLoading = useConversationsStore(
    (state) => state.conversationsLoading
  );
  const fetchConversations = useConversationsStore(
    (state) => state.fetchConversations
  );
  const hasFetched = useConversationsStore((state) => state.hasFetched);
  const activeConversationId = useChatStore((state) => state.conversationId);
  const pending = useChatStore((state) => state.pending);
  const setConversation = useChatStore((state) => state.setConversation);

  useEffect(() => {
    if (hasFetched) {
      return;
    }
    void fetchConversations();
  }, [fetchConversations, hasFetched]);

  useEffect(() => {
    if (!conversations.length) return;
    for (const item of conversations) {
      void router.prefetch(`/c/${item.id}`);
    }
  }, [conversations, router]);

  if (conversationsLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-(--text-tertiary)">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-xs">加载会话中...</span>
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="rounded-xl border border-dashed border-(--border-subtle) bg-(--surface-base)/50 p-4 text-center text-xs text-(--text-tertiary)">
        登录后，历史会话会显示在这里。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeConversationId}
          onClick={async () => {
            if (pending) {
              const confirmed = window.confirm(
                "AI正在生成内容，离开当前对话可能会丢失正在生成的内容，确定要离开吗？"
              );
              if (!confirmed) {
                return;
              }
            }
            setConversation(conversation.id);
            router.push(`/c/${conversation.id}`);
          }}
        />
      ))}
    </div>
  );
}
