"use client";

import { ModelSelector } from "@/src/features/model/components/ModelSelector";
import { NewChatButton } from "@/src/shared/components/NewChatButton";

export function Header() {
  return (
    <header className="flex flex-col gap-3 border-b border-(--border-subtle) bg-(--surface-card) px-4 sm:px-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-1 min-w-[220px] items-center gap-3">
          <span className="text-sm font-medium text-(--text-secondary)">
            当前模型
          </span>
          <ModelSelector />
        </label>
        <div className="ml-auto">
          <NewChatButton />
        </div>
      </div>
    </header>
  );
}
