"use client";

import { useEffect } from "react";
import { Composer } from "@/src/features/chat/components/Composer";
import { Header } from "@/src/features/chat/components/Header";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useParams } from "next/navigation";

export function ChatPage() {
  const messages = useChatStore((state) => state.messages);
  const currentConversationId = useChatStore(
    (state) => state.conversationId
  );
  const selectConversation = useChatStore(
    (state) => state.selectConversation
  );
  const params = useParams();
  const routeConversationId =
    params && typeof params.conversationId === "string"
      ? params.conversationId
      : null;
  const messageCount = messages.length;

  const isInitial = messageCount === 0;

  useEffect(() => {
    if (!routeConversationId) {
      return;
    }
    if (routeConversationId === currentConversationId) {
      return;
    }
    void selectConversation(routeConversationId);
  }, [routeConversationId, currentConversationId, selectConversation]);

  return (
    <div className="flex h-full w-full flex-col">
      <Header />
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative">
          {!isInitial && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <MessageList />
            </div>
          )}
          <Composer isInitial={isInitial} />
        </div>
        <PreviewPanel />
      </main>
    </div>
  );
}

export default function Home() {
  return <ChatPage />;
}
