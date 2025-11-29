"use client";

import { PanelLeft } from "lucide-react";
import { ModelSelector } from "@/src/features/model/components/ModelSelector";
import { NewChatButton } from "./NewChatButton";
import { useMobileUIStore } from "@/src/features/sidebar/store/useMobileUIStore";

export function Header() {
  const openSidebar = useMobileUIStore((state) => state.openSidebar);

  return (
    <header className="flex flex-col gap-3 border-b border-(--border-subtle) bg-(--surface-card) px-3 sm:px-4 md:px-6 py-3 sm:py-4">
      <div className="flex flex-wrap items-center gap-3 px-1 sm:px-3">
        <button
          type="button"
          aria-label="打开侧边栏"
          onClick={openSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-full text-(--text-tertiary) transition-colors hover:bg-(--surface-hover) hover:text-foreground md:hidden"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <ModelSelector />
        <div className="ml-auto">
          <NewChatButton />
        </div>
      </div>
    </header>
  );
}
