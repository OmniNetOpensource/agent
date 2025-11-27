"use client";

import { useEffect, useRef } from "react";
import { Composer } from "@/src/features/chat/components/Composer";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";
import type { Message } from "@/src/features/chat/types/chat";
import type { Conversation } from "@/types/conversation";

type Props = {
  conversationId: string | null;
  initialMessages: Message[];
  conversation?: Conversation;
};

export default function ConversationClient({
  conversationId,
  initialMessages,
  conversation,
}: Props) {
  const setMessages = useChatStore((state) => state.setMessages);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const addConversation = useConversationsStore(
    (state) => state.addConversation
  );
  const messages = useChatStore((state) => state.messages);
  const clear = useChatStore((state) => state.clear);
  const initializedRef = useRef(false);

  const isNewChat = conversationId === null;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    clear();

    if (isNewChat) {
      return;
    }

    setConversationId(conversationId);
    setMessages(initialMessages);
    if (conversation) {
      addConversation(conversation);
    }
  }, [
    addConversation,
    clear,
    conversation,
    conversationId,
    initialMessages,
    isNewChat,
    setConversationId,
    setMessages,
  ]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full w-full flex-col">
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative">
          {hasMessages && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <MessageList />
            </div>
          )}
          <Composer isNewchat={isNewChat && !hasMessages} />
        </div>
        <PreviewPanel />
      </main>
    </div>
  );
}
