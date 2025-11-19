"use client";

import { useCallback, useState } from "react";
import { PanelLeft } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { useChatStore } from "@/store/useChatStore";

export default function ChatPageClient() {
  const messages = useChatStore((state) => state.messages);
  const messageCount = messages.length;
  const pending = useChatStore((state) => state.pending);
  const resetConversation = useChatStore((state) => state.resetConversation);

  const isInitial = messageCount === 0;
  const canClearConversation = !pending && messageCount > 0;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleClearConversation = useCallback(() => {
    if (!canClearConversation) {
      return;
    }
    resetConversation();
  }, [canClearConversation, resetConversation]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div
        className={`${
          isSidebarOpen ? "w-72" : "w-0"
        } shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden`}
      >
        <div className="w-72 h-full">
          <Sidebar
            canClearConversation={canClearConversation}
            onClear={handleClearConversation}
            onToggle={toggleSidebar}
          />
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div
          className={`absolute top-4 left-4 z-10 transition-opacity duration-300 ${
            !isSidebarOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            onClick={toggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-(--button-secondary-border) bg-(--button-secondary-bg) text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        </div>
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
