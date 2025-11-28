"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";
import { ConversationItem } from "./ConversationItem";

export function ConversationList() {
  const conversations = useConversationsStore((state) => state.conversations);
  const conversationsLoading = useConversationsStore(
    (state) => state.conversationsLoading
  );
  const fetchConversations = useConversationsStore(
    (state) => state.fetchConversations
  );
  const hasFetched = useConversationsStore((state) => state.hasFetched);
  const activeConversationId = useChatStore((state) => state.conversationId);

  useEffect(() => {
    if (hasFetched) {
      return;
    }
    void fetchConversations();
  }, [fetchConversations, hasFetched]);

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
        />
      ))}
    </div>
  );
}
