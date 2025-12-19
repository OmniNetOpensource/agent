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
  const loadLocalConversations = useConversationsStore(
    (state) => state.loadLocalConversations
  );
  const hasLoadedLocal = useConversationsStore((state) => state.hasLoadedLocal);
  const activeConversationId = useChatStore((state) => state.conversationId);

  useEffect(() => {
    void loadLocalConversations();
  }, [loadLocalConversations]);

  if (conversationsLoading && !hasLoadedLocal) {
    return (
      <div className="flex items-center justify-center py-6 text-(--text-tertiary)">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-xs">加载会话中...</span>
      </div>
    );
  }

  if (!conversations.length && hasLoadedLocal) {
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
