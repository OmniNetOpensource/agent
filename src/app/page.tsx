"use client";

import { useEffect, useState } from "react";
import { Composer } from "@/src/features/chat/components/Composer";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useParams } from "next/navigation";

export function ChatPage() {
  const [notFoundRouteId, setNotFoundRouteId] = useState<string | null>(null);
  const messages = useChatStore((state) => state.messages);
  const currentConversationId = useChatStore(
    (state) => state.conversationId
  );
  const selectConversation = useChatStore(
    (state) => state.selectConversation
  );
  const resetConversation = useChatStore((state) => state.resetConversation);
  const params = useParams();
  const routeConversationId =
    params && typeof params.conversationId === "string"
      ? params.conversationId
      : null;
  const messageCount = messages.length;

  const isInitial = messageCount === 0;

  useEffect(() => {
    let canceled = false;

    const loadConversation = async () => {
      if (!routeConversationId) {
        resetConversation();
        return;
      }

      if (routeConversationId === currentConversationId) {
        return;
      }

      const success = await selectConversation(routeConversationId);
      if (canceled) {
        return;
      }

      if (!success) {
        setNotFoundRouteId(routeConversationId);
        return;
      }

      setNotFoundRouteId(null);
    };

    void loadConversation();

    return () => {
      canceled = true;
    };
  }, [
    routeConversationId,
    currentConversationId,
    selectConversation,
    resetConversation,
  ]);

  const isNotFound =
    routeConversationId !== null && notFoundRouteId === routeConversationId;

  if (isNotFound) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-(--text-primary)">404</h1>
          <p className="mt-4 text-(--text-secondary)">对话不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
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
