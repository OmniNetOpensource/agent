"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { ModelSelector } from "@/src/features/model/components/ModelSelector";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export function Header() {
  const messages = useChatStore((state) => state.messages);
  const messageCount = messages.length;
  const pending = useChatStore((state) => state.pending);
  const resetConversation = useChatStore((state) => state.resetConversation);

  const currentModel = useChatStore((state) => state.currentModel);
  const setCurrentModel = useChatStore((state) => state.setCurrentModel);

  const canClearConversation = !pending && messageCount > 0;

  const handleClearConversation = useCallback(() => {
    if (!canClearConversation) {
      return;
    }
    resetConversation();
  }, [canClearConversation, resetConversation]);

  return (
    <header className="flex flex-col gap-3 border-b border-(--border-subtle) bg-(--surface-card) px-4 sm:px-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
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
  );
}
