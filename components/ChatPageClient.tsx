"use client";

import { useCallback, useState } from "react";
import { PanelLeft, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { useChatStore } from "@/store/useChatStore";
import { ModelSelector } from "@/components/ui/ModelSelector";

export default function ChatPageClient() {
  const messages = useChatStore((state) => state.messages);
  const messageCount = messages.length;
  const pending = useChatStore((state) => state.pending);
  const resetConversation = useChatStore((state) => state.resetConversation);

  const currentModel = useChatStore((state) => state.currentModel);
  const setCurrentModel = useChatStore((state) => state.setCurrentModel);

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
        <div className="flex h-full w-full flex-col ">
          <header className="flex flex-col gap-3 border-b border-(--border-subtle) bg-(--surface-card) px-4 sm:px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-(--button-secondary-border) bg-(--button-secondary-bg) text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                aria-label={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
              >
                <PanelLeft className="h-5 w-5" />
              </button>
              <label className="flex flex-1 min-w-[220px] items-center gap-3">
                <span className="text-sm font-medium text-(--text-secondary)">
                  当前模型
                </span>
                <ModelSelector 
                  currentModel={currentModel} 
                  onModelChange={setCurrentModel} 
                />
              </label>
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={handleClearConversation}
                  disabled={!canClearConversation}
                  className="inline-flex items-center gap-2 rounded-2xl border border-(--button-secondary-border) bg-(--button-secondary-bg) px-4 py-2 text-sm font-medium text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  新建聊天
                </button>
              </div>
            </div>
          </header>
          <main className="relative flex-1 min-h-0">
            <MessageList />
            <Composer isInitial={isInitial} />
          </main>
        </div>
      </div>
    </div>
  );
}
