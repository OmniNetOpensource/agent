"use client";

import { useSyncExternalStore, useCallback } from "react";
import { Moon, Sun, Plus } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { ConversationSummary } from "@/utils/storage";
import { cx } from "@/utils/cx";

type SidebarProps = {
  canClearConversation: boolean;
  onClear: () => void;
  conversations: ConversationSummary[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
};

export default function Sidebar({
  canClearConversation,
  onClear,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}: SidebarProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { theme, toggleTheme } = useTheme();

  const handleNewConversation = useCallback(() => {
    if (!canClearConversation) {
      return;
    }
    onNewConversation();
    if (onNewConversation !== onClear) {
      onClear();
    }
  }, [canClearConversation, onClear, onNewConversation]);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-(--border-subtle) bg-(--surface-muted)">
      <div className="flex items-center justify-between gap-3 border-b border-(--border-subtle) px-4 py-4">
        <button
          type="button"
          onClick={handleNewConversation}
          disabled={!canClearConversation}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-(--button-secondary-border) bg-(--button-secondary-bg) px-4 py-2 text-sm font-medium text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          新对话
        </button>
        {mounted && (
          <button
            type="button"
            onClick={toggleTheme}
            title="切换深色模式"
            aria-label="切换深色模式"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-(--button-secondary-border) bg-(--button-secondary-bg) text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {conversations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-(--border-subtle) px-4 py-6 text-center text-sm text-(--text-tertiary)">
            暂无历史对话
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cx(
                    "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                    isActive
                      ? "border-(--border-strong) bg-(--surface-card) text-foreground"
                      : "border-transparent bg-transparent text-(--text-secondary) hover:border-(--border-subtle) hover:bg-(--surface-card) hover:text-foreground"
                  )}
                >
                  <div className="text-sm font-medium truncate">
                    {conversation.title || "新的对话"}
                  </div>
                  <div className="text-xs text-(--text-tertiary)">
                    {conversation.messageCount} 条消息
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
