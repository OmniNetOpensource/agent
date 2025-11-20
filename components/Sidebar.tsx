"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Moon, PanelLeft, Plus, Sun } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { useTheme } from "@/hooks/useTheme";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { theme, toggleTheme } = useTheme();
  const messages = useChatStore((state) => state.messages);
  const pending = useChatStore((state) => state.pending);
  const resetConversation = useChatStore((state) => state.resetConversation);
  const canClearConversation = !pending && messages.length > 0;

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
            duration: 300,
            easing: "ease-in",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    },
    [toggleTheme]
  );

  const handleNewChat = useCallback(() => {
    if (!canClearConversation) {
      return;
    }
    resetConversation();
  }, [canClearConversation, resetConversation]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <aside
      className={`flex h-full flex-col border-r border-(--border-subtle) bg-(--surface-muted) transition-[width] duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-72"
      }`}
    >
      <div
        className={`border-b border-(--border-subtle) px-3 py-[14.8px] ${
          isCollapsed
            ? "flex flex-col items-center gap-3"
            : "flex items-center gap-2"
        }`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-(--button-secondary-border) bg-(--button-secondary-bg) text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
        >
          <PanelLeft
            className={`h-5 w-5 transition-transform ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          type="button"
          onClick={handleNewChat}
          disabled={!canClearConversation}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-(--button-secondary-border) bg-(--button-secondary-bg) text-sm font-medium text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            isCollapsed ? "h-10 w-10" : "flex-1 px-4 py-2"
          }`}
          aria-label="新对话"
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span>新对话</span>}
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
        {!isCollapsed && (
          <p className="rounded-xl border border-dashed border-(--border-subtle) px-4 py-6 text-center text-sm text-(--text-tertiary)">
            历史记录功能暂未启用
          </p>
        )}
      </div>
    </aside>
  );
}
