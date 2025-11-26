"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Composer } from "@/src/features/chat/components/Composer";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export default function ConversationPage() {
  const [notFoundRouteId, setNotFoundRouteId] = useState<string | null>(null);
  const currentConversationId = useChatStore((state) => state.conversationId);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const params = useParams();
  const routeConversationId =
    params && typeof params.conversationId === "string"
      ? params.conversationId
      : null;

  useEffect(() => {
    let canceled = false;

    const loadConversation = async () => {
      if (!routeConversationId) {
        setNotFoundRouteId(null);
        return;
      }

      if (routeConversationId === currentConversationId) {
        setNotFoundRouteId(null);
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
  }, [routeConversationId]);

  const isNotFound =
    routeConversationId !== null && notFoundRouteId === routeConversationId;

  if (isNotFound) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <p className="mt-4 text-(--text-secondary)">对话不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MessageList />
          </div>
          <Composer />
        </div>
        <PreviewPanel />
      </main>
    </div>
  );
}
