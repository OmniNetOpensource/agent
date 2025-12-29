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

  const pinnedConversations = conversations.filter((conversation) =>
    Boolean(conversation.pinned)
  );
  const regularConversations = conversations.filter(
    (conversation) => !conversation.pinned
  );
  const hasPinned = pinnedConversations.length > 0;
  const hasRegular = regularConversations.length > 0;

  return (
    <div className="flex flex-col gap-1">
      {hasPinned ? (
        <>
          <div className="px-3 py-1 text-[11px] font-medium text-(--text-tertiary)">
            置顶
          </div>
          <div className="flex flex-col gap-1">
            {pinnedConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
              />
            ))}
          </div>
        </>
      ) : null}
      {hasPinned && hasRegular ? (
        <div className="my-2 h-px w-full bg-(--border-subtle)" />
      ) : null}
      {hasRegular ? (
        <>
          <div className="px-3 py-1 text-[11px] font-medium text-(--text-tertiary)">
            最近
          </div>
          <div className="flex flex-col gap-1">
            {regularConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
