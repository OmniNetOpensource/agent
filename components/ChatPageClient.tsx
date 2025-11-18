"use client";

import { useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { useChatStore } from "@/store/useChatStore";

export default function ChatPageClient() {
  const messageCount = useChatStore((state) => state.messages.length);
  const pending = useChatStore((state) => state.pending);
  const clearConversation = useChatStore((state) => state.clearConversation);

  const isInitial = messageCount === 0;
  const canClearConversation = !pending && messageCount > 0;

  const handleClearConversation = useCallback(() => {
    if (!canClearConversation) {
      return;
    }
    clearConversation();
  }, [canClearConversation, clearConversation]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        canClearConversation={canClearConversation}
        onClear={handleClearConversation}
      />
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full w-full flex-col ">
          <main className="relative flex-1 min-h-0">
            <MessageList />
            <Composer isInitial={isInitial} />
          </main>
        </div>
      </div>
    </div>
  );
}
