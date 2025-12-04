"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { usePreviewStore } from "@/src/features/preview/store/usePreviewStore";
import { Button } from "@/components/ui/button";

export function NewChatButton() {
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
      className="group relative h-10 w-10 overflow-hidden rounded-xl px-0 md:w-auto md:pr-3"
      aria-label="新对话"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
      </span>
      <span className="hidden overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 md:block">
        新对话
      </span>
    </Button>
  );
}
