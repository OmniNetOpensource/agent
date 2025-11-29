"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { usePreviewStore } from "@/src/features/preview/store/usePreviewStore";

export function NewChatButton() {
  const router = useRouter();
  const { pending, clear } = useChatStore();
  const { resetPreview } = usePreviewStore();

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
    clear();
    resetPreview();
  };

  return (
    <button
      type="button"
      onClick={handleNewChat}
      className="group relative inline-flex h-10 items-center overflow-hidden rounded-xl cursor-pointer text-foreground transition-colors hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50 w-10 md:w-full"
      aria-label="新对话"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        <Plus className="h-5 w-5 text-foreground transition-transform duration-300 group-hover:rotate-90" />
      </span>
      <span className="overflow-hidden whitespace-nowrap text-sm font-medium text-foreground transition-all duration-300 hidden md:block">
        新对话
      </span>
    </button>
  );
}