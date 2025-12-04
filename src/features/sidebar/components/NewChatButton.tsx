"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { usePreviewStore } from "@/src/features/preview/store/usePreviewStore";
import { Button } from "@/components/ui/button";

interface NewChatButtonProps {
  isCollapsed?: boolean;
}

export function NewChatButton({ isCollapsed = false }: NewChatButtonProps) {
  const router = useRouter();
  const pending = useChatStore((state) => state.pending);
  const clear = useChatStore((state) => state.clear);
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
    <Button
      variant="ghost"
      onClick={handleNewChat}
      className="group relative h-10 w-full justify-start px-0 overflow-hidden"
      aria-label="新对话"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
      </span>
      <span
        className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 ${
          isCollapsed ? "w-0 opacity-0" : "opacity-100"
        }`}
      >
        新对话
      </span>
    </Button>
  );
}
