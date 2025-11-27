"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

interface NewChatButtonProps {
  isCollapsed?: boolean;
}

export function NewChatButton({ isCollapsed = false }: NewChatButtonProps) {
  const router = useRouter();
  const { pending, clear } = useChatStore();

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
  };

  return (
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
  );
}