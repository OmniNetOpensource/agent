"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelLeft, X } from "lucide-react";

import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { ConversationList } from "./history/ConversationList";
import { ProfileMenu } from "./profile/ProfileMenu";
import { NewChatButton } from "./NewChatButton";
import { useMobileStore } from "@/src/shared/mobile/useMobileStore";

function SidebarToggle({
  isOpen,
  setIsOpen,
  isMobile,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  isMobile: boolean;
}) {
  const handleClick = () => setIsOpen(!isOpen);

  if (isMobile) {
    return (
      <button
        type="button"
        onClick={isOpen ? undefined : handleClick}
        aria-label={isOpen ? "关闭侧边栏" : "打开侧边栏"}
        className={`fixed top-4 left-4 z-[calc(var(--z-mobile-overlay)-1)] inline-flex h-10 w-10 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${
          isOpen ? "pointer-events-none" : ""
        }`}
      >
        <PanelLeft className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isOpen ? "收起侧边栏" : "展开侧边栏"}
      className="absolute top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-all duration-500 hover:bg-accent hover:text-accent-foreground active:scale-95"
      style={{ right: isOpen ? 12 : 4 }}
    >
      <PanelLeft
        className={`h-5 w-5 transition-transform duration-500 ${
          isOpen ? "" : "rotate-180"
        }`}
      />
    </button>
  );
}

function MobileSidebarWrapper({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-(--z-mobile-overlay) ${
        !isOpen ? "pointer-events-none" : ""
      }`}
    >
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/50 mobile-sidebar-overlay"
          onClick={onClose}
        />
      )}
      <aside
        className={`absolute left-0 top-0 h-full bg-background mobile-sidebar-drawer z-(--z-mobile-sidebar) overflow-hidden ${
          isOpen ? "w-[80vw] max-w-xs transition-[width] duration-300" : "w-0"
        }`}
      >
        {children}
      </aside>
    </div>
  );
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMobileStore((state) => state.isMobile);
  const { user } = useAuth();

  if (isMobile) {
    return (
      <>
        <SidebarToggle isOpen={isOpen} setIsOpen={setIsOpen} isMobile={true} />
        <MobileSidebarWrapper isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="flex h-full flex-col border-r border-(--border-subtle) bg-(--surface-muted)/80 backdrop-blur-md">
            <div className="flex items-center justify-between px-3 h-14 shrink-0">
              <Link
                href="/app"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-primary transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="返回首页"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                  aria-label="Aether"
                >
                  <circle cx="50" cy="50" r="18" />
                  <path
                    d="M 26 26 A 34 34 0 1 1 74 74"
                    transform="rotate(-45 50 50)"
                  />
                </svg>
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="关闭侧边栏"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-3 pb-4">
              <NewChatButton isCollapsed={false} />
            </div>

            <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-2">
              <div className="flex h-full flex-col gap-3">
                {user ? (
                  <ConversationList />
                ) : (
                  <div className="rounded-xl border border-dashed border-(--border-subtle) bg-(--surface-base)/50 p-4 text-xs text-(--text-tertiary)">
                    登录后可保存并查看历史记录，未登录仅在当前页临时存储。
                  </div>
                )}
              </div>
            </div>

            <ProfileMenu isCollapsed={false} />
          </div>
        </MobileSidebarWrapper>
      </>
    );
  }

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-(--border-subtle) bg-(--surface-muted)/50 backdrop-blur-md transition-[width] duration-500 ${
        isOpen ? "w-52" : "w-12"
      }`}
    >
      <div
        className="absolute top-0 left-0 right-0 h-16 flex items-center transition-all duration-500"
        style={{ paddingLeft: isOpen ? 12 : 4, paddingRight: isOpen ? 12 : 4 }}
      >
        <Link
          href="/app"
          className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-md text-primary transition-all duration-500 hover:bg-accent hover:text-accent-foreground"
          aria-label="返回首页"
          style={{
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-label="Aether"
          >
            <circle cx="50" cy="50" r="18" />
            <path
              d="M 26 26 A 34 34 0 1 1 74 74"
              transform="rotate(-45 50 50)"
            />
          </svg>
        </Link>

        <SidebarToggle isOpen={isOpen} setIsOpen={setIsOpen} isMobile={false} />
      </div>

      <div className="pt-16 flex-1 flex flex-col min-h-0">
        <div
          className="pb-4 shrink-0 flex transition-all duration-500"
          style={{
            paddingLeft: isOpen ? 12 : 4,
            paddingRight: isOpen ? 12 : 4,
          }}
        >
          <NewChatButton isCollapsed={!isOpen} />
        </div>

        <div
          className={`flex-1 min-h-0 overflow-x-hidden px-4 py-2 ${
            !isOpen ? "overflow-y-hidden" : "overflow-y-auto"
          }`}
        >
          <div
            className={`flex flex-col gap-3 transition-opacity duration-300 ${
              !isOpen ? "opacity-0 invisible" : "opacity-100 visible"
            }`}
          >
            {user ? (
              <ConversationList />
            ) : (
              <div className="rounded-xl border border-dashed border-(--border-subtle) bg-(--surface-base)/50 p-4 text-xs text-(--text-tertiary)">
                登录后可保存并查看历史记录，未登录仅在当前页临时存储。
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <ProfileMenu isCollapsed={!isOpen} />
        </div>
      </div>
    </aside>
  );
}
