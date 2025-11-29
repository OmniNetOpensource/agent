"use client";

import { useEffect, useState } from "react";
import { PanelLeft, X } from "lucide-react";

import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { ConversationList } from "./history/ConversationList";
import { ProfileSection } from "./profile/ProfileSection";
import { NewChatButton } from "./NewChatButton";
import { useMobileUIStore } from "@/src/features/sidebar/store/useMobileUIStore";

type SidebarProps = {
  isMobileDrawer?: boolean;
};

export default function Sidebar({ isMobileDrawer = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { user, loading: authLoading, supabaseReady } = useAuth();
  const closeMobileSidebar = useMobileUIStore((state) => state.closeSidebar);

  const toggleCollapsed = () => {
    if (isMobileDrawer) {
      return;
    }
    setIsCollapsed((prev) => !prev);
  };

  const effectiveCollapsed = isMobileDrawer ? false : isCollapsed;

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }
  }, [supabaseReady]);

  return (
    <aside
      className={`flex h-full flex-col border-r border-(--border-subtle) bg-(--surface-muted)/50 backdrop-blur-md transition-[width] duration-500 cubic-bezier(0.32,0.72,0,1) ${
        isMobileDrawer ? "w-full" : effectiveCollapsed ? "w-16" : "w-52"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-5">
        <NewChatButton isCollapsed={effectiveCollapsed} />
        <div className="ml-auto flex items-center gap-2">
          {isMobileDrawer && (
            <button
              type="button"
              onClick={closeMobileSidebar}
              aria-label="关闭侧边栏"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-(--text-tertiary) transition-colors hover:bg-(--surface-hover) hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!isMobileDrawer && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={effectiveCollapsed ? "展开侧边栏" : "收起侧边栏"}
              className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full cursor-pointer text-muted-foreground transition-colors hover:bg-(--surface-hover) hover:text-foreground active:scale-95"
            >
              <PanelLeft
                className={`h-5 w-5 transition-transform duration-500 ${
                  effectiveCollapsed ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex-1 shrink-0 overflow-x-hidden px-4 py-2 ${
          effectiveCollapsed ? "overflow-y-hidden" : "overflow-y-auto"
        }`}
      >
        <div
          className={`flex h-full flex-col gap-3 transition-opacity duration-300 ${
            effectiveCollapsed ? "opacity-0 invisible" : "opacity-100 visible"
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

      <ProfileSection isCollapsed={effectiveCollapsed} />
    </aside>
  );
}
