"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelLeft, X } from "lucide-react";

import { ConversationList } from "./history/ConversationList";
import { ProfileMenu } from "./profile/ProfileMenu";
import { NewChatButton } from "./NewChatButton";
import { useIsMobile } from "@/src/shared/mobile/MobileContext";
import { useSidebarStore } from "@/src/features/sidebar/store/useSidebarStore";

function MobileSidebarToggle({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

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
  const isMobile = useIsMobile();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isOpen = useSidebarStore((state) => state.isOpen);

  if (isMobile) {
    return (
      <>
        <MobileSidebarToggle
          isOpen={isMobileOpen}
          setIsOpen={setIsMobileOpen}
        />
        <MobileSidebarWrapper
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
        >
          <div className="flex h-full flex-col bg-background">
            <div className="flex items-center justify-between px-3 h-14 shrink-0">
              <div className="h-10 w-10" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
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
                <ConversationList />
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
      className={`relative flex h-full flex-col overflow-hidden bg-background transition-[width] duration-300 ${
        isOpen ? "w-52 shrink-0" : "w-0"
      }`}
    >
      {isOpen ? (
        <>
          <div className="flex items-center px-3 h-14 shrink-0">
            <div className="h-10 w-10" aria-hidden="true" />
          </div>

          <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-2">
            <div className="flex h-full flex-col gap-3">
              <ConversationList />
            </div>
          </div>

          <ProfileMenu isCollapsed={false} />
        </>
      ) : null}
    </aside>
  );
}
