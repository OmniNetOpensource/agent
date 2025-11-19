"use client";

import { useSyncExternalStore, useCallback } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun, Plus, PanelLeft } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

type SidebarProps = {
  canClearConversation: boolean;
  onClear: () => void;
  onToggle: () => void;
};

export default function Sidebar({
  canClearConversation,
  onClear,
  onToggle,
}: SidebarProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { theme, toggleTheme } = useTheme();

  const handleThemeToggle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (
        !(document as any).startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        toggleTheme();
        return;
      }

      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transition = (document as any).startViewTransition(() => {
        flushSync(() => {
          toggleTheme();
        });
      });

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];

        document.documentElement.animate(
          {
            clipPath: clipPath,
          },
          {
            duration: 300,
            easing: "ease-in",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    },
    [toggleTheme]
  );

  return (
    <aside className="flex h-full w-72 flex-col border-r border-(--border-subtle) bg-(--surface-muted)">
      <div className="flex items-center justify-between gap-2 border-b border-(--border-subtle) px-4 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-(--button-secondary-border) bg-(--button-secondary-bg) text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!canClearConversation}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-(--button-secondary-border) bg-(--button-secondary-bg) px-4 py-2 text-sm font-medium text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          新对话
        </button>
        {mounted && (
          <button
            type="button"
            onClick={handleThemeToggle}
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
        <p className="rounded-xl border border-dashed border-(--border-subtle) px-4 py-6 text-center text-sm text-(--text-tertiary)">
          历史记录功能暂未启用
        </p>
      </div>
    </aside>
  );
}
