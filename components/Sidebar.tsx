"use client";

import { useSyncExternalStore, useCallback } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun, Plus, MessageSquare, History } from "lucide-react";
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
  void onToggle;
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { theme, toggleTheme } = useTheme();

  const handleThemeToggle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (
        !(document as Document).startViewTransition ||
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

      const transition = (document as Document).startViewTransition(() => {
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
            duration: 400,
            easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    },
    [toggleTheme]
  );

  return (
    <aside className="flex h-full w-full flex-col bg-(--surface-muted)/50 backdrop-blur-sm border-r border-(--border-subtle)">
      {/* Header Area */}
      <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-(--text-secondary) uppercase tracking-wider">
            工作区
          </h2>
          {mounted && (
            <button
              type="button"
              onClick={handleThemeToggle}
              title={theme === "dark" ? "切换到亮色" : "切换到深色"}
              className="group relative flex h-8 w-8 items-center justify-center rounded-full text-(--text-tertiary) transition-all hover:bg-(--surface-hover) hover:text-(--text-primary)"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 transition-transform group-hover:rotate-90" />
              ) : (
                <Moon className="h-4 w-4 transition-transform group-hover:-rotate-12" />
              )}
            </button>
          )}
        </div>
        
        <button
          type="button"
          onClick={onClear}
          disabled={!canClearConversation}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-(--button-primary-bg) px-4 py-3 text-sm font-semibold text-(--button-primary-text) shadow-lg shadow-(--button-primary-bg)/10 transition-all hover:shadow-xl hover:shadow-(--button-primary-bg)/20 hover:translate-y-[-1px] active:translate-y-[0px] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          <span>新对话</span>
        </button>
      </div>

      {/* Navigation / History Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-2 px-2 text-xs font-medium text-(--text-tertiary)">
          历史记录
        </div>
        
        {/* Placeholder for history items with a skeleton-like look or empty state */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--border-subtle) bg-(--surface-base)/50 px-4 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--surface-muted)">
            <History className="h-5 w-5 text-(--text-tertiary)" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-(--text-secondary)">暂无记录</p>
            <p className="text-xs text-(--text-tertiary)">开始一个新的对话吧</p>
          </div>
        </div>
      </div>

      {/* Footer / User Area (Optional placeholder) */}
      <div className="mt-auto border-t border-(--border-subtle) p-4">
        <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-(--surface-hover) cursor-pointer">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-inner" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-(--text-primary)">My Workspace</span>
            <span className="text-xs text-(--text-tertiary)">Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
