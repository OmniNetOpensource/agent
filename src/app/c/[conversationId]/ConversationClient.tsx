"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

type Props = {
  conversationId: string | null;
};

export default function ConversationClient({ conversationId }: Props) {
  const router = useRouter();
  const clear = useChatStore((state) => state.clear);
  const setMessages = useChatStore((state) => state.setMessages);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const [loading, setLoading] = useState(conversationId !== null);

  const isNewChat = conversationId === null;

  useEffect(() => {
    if (isNewChat) {
      clear();
      return;
    }

    setConversationId(conversationId);
    setMessages([]);

    selectConversation(conversationId, () => {
      alert("加载对话失败，请重试");
      router.push("/c/new");
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (isNewChat) {
    return null;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-(--text-tertiary) text-sm">
          加载中...
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MessageList />
        </div>
      )}
    </div>
  );
}
