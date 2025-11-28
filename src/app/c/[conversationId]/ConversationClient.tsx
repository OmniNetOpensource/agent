"use client";

import { useEffect, useState } from "react";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

type Props = {
  conversationId: string;
};

export default function ConversationClient({ conversationId }: Props) {
  const messages = useChatStore((state) => state.messages);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const [loading, setLoading] = useState(conversationId !== "new");

  const isNewChat = conversationId === "new";
  const hasMessages = messages.length > 0;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await setConversationId(conversationId);
      if (!cancelled) {
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [conversationId, setConversationId]);

  if (isNewChat) {
    return null;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {loading && !hasMessages ? (
        <div className="flex-1 flex items-center justify-center text-(--text-tertiary) text-sm">
          加载中...
        </div>
      ) : hasMessages ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MessageList />
        </div>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
