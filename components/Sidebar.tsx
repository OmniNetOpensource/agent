"use client";

import { Moon, Sun, Trash2 } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

type SidebarProps = {
  canClearConversation: boolean;
  onClear: () => void;
};

export default function Sidebar({
  canClearConversation,
  onClear,
}: SidebarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <aside className="flex h-full w-16 flex-col items-center gap-3 border-r border-(--border-subtle) bg-(--surface-muted) py-4">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          disabled={!canClearConversation}
          title="清空对话"
          aria-label="清空对话"
          className="h-10 w-10 rounded-xl inline-flex items-center justify-center border border-(--button-secondary-border) text-(--button-secondary-text) hover:bg-(--button-secondary-hover) bg-(--button-secondary-bg) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          title="切换深色模式"
          aria-label="切换深色模式"
          className="h-10 w-10 rounded-xl inline-flex items-center justify-center border border-(--button-secondary-border) text-(--button-secondary-text) hover:bg-(--button-secondary-hover) bg-(--button-secondary-bg) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
