"use client";

import { useEffect, useState } from "react";
import { PanelLeft } from "lucide-react";

import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { ConversationList } from "./history/ConversationList";
import { ProfileSection } from "./profile/ProfileSection";
import { NewChatButton } from "@/src/shared/components/NewChatButton";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { user, loading: authLoading, supabaseReady } = useAuth();

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }
  }, [supabaseReady]);

  return (
    <aside
      className={`flex h-full flex-col border-r border-(--border-subtle) bg-(--surface-muted)/50 backdrop-blur-md transition-[width] duration-500 cubic-bezier(0.32,0.72,0,1) ${
        isCollapsed ? "w-16" : "w-52"
      }`}
    >
      <div className="flex flex-col gap-2 px-3 py-5">
        <NewChatButton isCollapsed={isCollapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
          className="relative inline-flex h-10 w-full items-center overflow-hidden rounded-xl cursor-pointer text-muted-foreground transition-colors hover:bg-(--surface-hover) hover:text-foreground active:scale-95"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center">
            <PanelLeft
              className={`h-5 w-5 transition-transform duration-500 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          </span>
          <span
            className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 ${
              isCollapsed ? "w-0 opacity-0" : "opacity-100"
            }`}
          >
            收起侧边栏
          </span>
        </button>
      </div>

      <div
        className={`flex-1 shrink-0 overflow-x-hidden px-4 py-2 ${
          isCollapsed ? "overflow-y-hidden" : "overflow-y-auto"
        }`}
      >
        <div
          className={`flex h-full flex-col gap-3 transition-opacity duration-300 ${
            isCollapsed ? "opacity-0 invisible" : "opacity-100 visible"
          }`}
        >
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
      </div>

      <ProfileSection isCollapsed={isCollapsed} />
    </aside>
  );
}
