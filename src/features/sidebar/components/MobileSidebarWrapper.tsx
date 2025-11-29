"use client";

import { useEffect } from "react";
import Sidebar from "./Sidebar";
import { useMobileUIStore } from "@/src/features/sidebar/store/useMobileUIStore";

export function MobileSidebarWrapper() {
  const isSidebarOpen = useMobileUIStore((state) => state.isSidebarOpen);
  const closeSidebar = useMobileUIStore((state) => state.closeSidebar);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen, closeSidebar]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isSidebarOpen]);

  if (!isSidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-mobile-sidebar)] md:hidden">
      <button
        type="button"
        aria-label="关闭侧边栏"
        className="mobile-sidebar-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeSidebar}
      />
      <div className="mobile-sidebar-drawer absolute inset-y-0 left-0 flex w-[80vw] max-w-xs shadow-float">
        <Sidebar isMobileDrawer />
      </div>
    </div>
  );
}

