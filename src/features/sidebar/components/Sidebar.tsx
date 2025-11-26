"use client";

import { useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Moon, PanelLeft, Plus, Sun } from "lucide-react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useTheme } from "@/src/features/theme/hooks/useTheme";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
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

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
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
  };

  const handleNewChat = () => {
    if (!canClearConversation) {
      return;
    }
    resetConversation();
  };

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <aside
      className={`flex h-full flex-col border-r border-(--border-subtle) bg-(--surface-muted)/50 backdrop-blur-md transition-[width] duration-500 cubic-bezier(0.32,0.72,0,1) ${
        isCollapsed ? "w-20" : "w-[280px]"
      }`}
    >
      <div
        className={`px-4 py-5 ${
          isCollapsed
            ? "flex flex-col items-center gap-4"
            : "flex items-center justify-between gap-2"
        }`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-(--surface-hover) hover:text-foreground active:scale-95"
        >
          <PanelLeft
            className={`h-5 w-5 transition-transform duration-500 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          type="button"
          onClick={handleNewChat}
          disabled={!canClearConversation}
          className={`group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-background shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm disabled:hover:translate-y-0 ${
            isCollapsed ? "h-10 w-10 rounded-xl" : "h-9 flex-1 px-3"
          }`}
          aria-label="新对话"
        >
          <Plus className={`h-5 w-5 text-foreground transition-transform duration-300 group-hover:rotate-90 ${isCollapsed ? "" : "mr-2"}`} />
          {!isCollapsed && <span className="text-sm font-medium text-foreground">新对话</span>}
        </button>
        {mounted && !isCollapsed && (
          <button
            type="button"
            onClick={handleThemeToggle}
            title="切换深色模式"
            aria-label="切换深色模式"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-(--surface-hover) hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      
      {mounted && isCollapsed && (
        <div className="flex justify-center pb-4">
           <button
            type="button"
            onClick={handleThemeToggle}
            title="切换深色模式"
            aria-label="切换深色模式"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-(--surface-hover) hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {!isCollapsed && (
          <div className="rounded-xl border border-dashed border-(--border-subtle) bg-(--surface-base)/50 p-6 text-center">
            <p className="text-xs text-(--text-tertiary) font-medium tracking-wide">
              历史记录
            </p>
            <p className="mt-1 text-xs text-(--text-tertiary)/60">
              暂未启用
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
