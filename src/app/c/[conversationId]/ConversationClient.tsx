"use client";

import { useEffect } from "react";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

type Props = {
  conversationId: string;
};

export default function ConversationClient({ conversationId }: Props) {
  const setConversationId = useChatStore((state) => state.setConversationId);

  useEffect(() => {
    setConversationId(conversationId);
  }, [conversationId]);

  return conversationId !== "new" ? (
    <>
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MessageList />
        </div>
      </div>
    </>
  ) : null;
}
