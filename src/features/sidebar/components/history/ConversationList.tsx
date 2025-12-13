"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { ConversationItem } from "./ConversationItem";

export function ConversationList() {
  const conversations = useConversationsStore((state) => state.conversations);
  const conversationsLoading = useConversationsStore(
    (state) => state.conversationsLoading
  );
  const fetchConversations = useConversationsStore(
    (state) => state.fetchConversations
  );
  const loadLocalConversations = useConversationsStore(
    (state) => state.loadLocalConversations
  );
  const hasFetchedRemote = useConversationsStore(
    (state) => state.hasFetchedRemote
  );
  const hasLoadedLocal = useConversationsStore((state) => state.hasLoadedLocal);
  const activeConversationId = useChatStore((state) => state.conversationId);
  const { user } = useAuth();

  useEffect(() => {
    void loadLocalConversations();
  }, [loadLocalConversations]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (hasFetchedRemote) {
      return;
    }
    void fetchConversations();
  }, [fetchConversations, hasFetchedRemote, user]);

  if (conversationsLoading && !hasFetchedRemote) {
    return (
      <div className="flex items-center justify-center py-6 text-(--text-tertiary)">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-xs">加载会话中...</span>
      </div>
    );
  }

  if (!conversations.length && hasLoadedLocal && (!user || hasFetchedRemote)) {
    return (
      <div className="rounded-xl border border-dashed border-(--border-subtle) bg-(--surface-base)/50 p-4 text-center text-xs text-(--text-tertiary)">
        暂无会话，发送第一条消息后会自动出现在这里。
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
