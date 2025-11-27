"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Moon, PanelLeft, Plus, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useTheme } from "@/src/features/theme/hooks/useTheme";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { LoginButton } from "@/src/features/auth/components/LoginButton";
import { UserMenu } from "@/src/features/auth/components/UserMenu";
import { ConversationList } from "./ConversationList";

export default function Sidebar() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    loading: authLoading,
    signOut,
    supabaseReady,
  } = useAuth();
  const clear = useChatStore((state) => state.clear);
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const pending = useChatStore((state) => state.pending);
  const previousUserId = useRef<string | null>(null);

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
    if (pending) {
      const confirmed = window.confirm(
        "AI正在生成内容，离开当前对话可能会丢失正在生成的内容，确定要离开吗？"
      );
      if (!confirmed) {
        return;
      }
    }
    router.push("/c/new");
  };

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    if (user) {
      if (previousUserId.current !== user.id) {
        previousUserId.current = user.id;
        void fetchConversations();
      }
    } else if (previousUserId.current) {
      previousUserId.current = null;
      useChatStore.setState({
        conversations: [],
        conversationId: null,
      });
      clear();
    }
  }, [user, supabaseReady, fetchConversations, clear]);

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
          className={`group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-background shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm disabled:hover:translate-y-0 ${
            isCollapsed ? "h-10 w-10 rounded-xl" : "h-9 flex-1 px-3"
          }`}
          aria-label="新对话"
        >
          <Plus
            className={`h-5 w-5 text-foreground transition-transform duration-300 group-hover:rotate-90 ${
              isCollapsed ? "" : "mr-2"
            }`}
          />
          {!isCollapsed && (
            <span className="text-sm font-medium text-foreground">新对话</span>
          )}
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
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between px-1 text-xs font-semibold text-(--text-tertiary)">
              <span>历史记录</span>
              {user && (
                <span className="text-[11px] text-(--text-tertiary)">
                  {authLoading ? "同步中..." : "已登录"}
                </span>
              )}
            </div>
            {user ? (
              <ConversationList />
            ) : (
              <div className="rounded-xl border border-dashed border-(--border-subtle) bg-(--surface-base)/50 p-4 text-xs text-(--text-tertiary)">
                登录后可保存并查看历史记录，未登录仅在当前页临时存储。
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-(--border-subtle) px-4 py-4">
        {user ? (
          <UserMenu
            user={user}
            onSignOut={async () => {
              await signOut();
            }}
          />
        ) : (
          <LoginButton isCollapsed={isCollapsed} />
        )}
      </div>
    </aside>
  );
}
