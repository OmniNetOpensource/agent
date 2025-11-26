"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { ConversationItem } from "./ConversationItem";

export function ConversationList() {
  const router = useRouter();
  const conversations = useChatStore((state) => state.conversations);
  const conversationsLoading = useChatStore(
    (state) => state.conversationsLoading
  );
  const activeConversationId = useChatStore((state) => state.conversationId);
  const deleteConversation = useChatStore(
    (state) => state.deleteConversation
  );
  const selectConversation = useChatStore((state) => state.selectConversation);

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
            await selectConversation(conversation.id);
            router.push(`/c/${conversation.id}`);
          }}
          onDelete={async () => {
            await deleteConversation(conversation.id);
            if (conversation.id === activeConversationId) {
              router.push("/");
            }
          }}
        />
      ))}
    </div>
  );
}
