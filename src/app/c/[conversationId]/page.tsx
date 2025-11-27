"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Composer } from "@/src/features/chat/components/Composer";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export default function ConversationPage() {
  const router = useRouter();
  const selectConversation = useChatStore((state) => state.selectConversation);
  const clear = useChatStore((state) => state.clear);
  const params = useParams();
  const routeConversationId =
    params && typeof params.conversationId === "string"
      ? params.conversationId
      : null;

  useEffect(() => {
    const loadConversation = async () => {
      if (!routeConversationId) {
        return;
      }
      await selectConversation(routeConversationId, () => {
        clear();
        router.replace("/404");
      });
    };

    void loadConversation();
  }, [routeConversationId]);

  return (
    <div className="flex h-full w-full flex-col">
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MessageList />
          </div>
          <Composer isNewchat={false} />
        </div>
        <PreviewPanel />
      </main>
    </div>
  );
}
