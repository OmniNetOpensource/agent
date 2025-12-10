"use client";

import type React from "react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { usePreviewStore } from "@/src/features/preview/store/usePreviewStore";

export function useNewChat() {
  const pending = useChatStore((state) => state.pending);
  const clear = useChatStore((state) => state.clear);
  const { resetPreview } = usePreviewStore();

  const handleNewChat = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const isModifiedClick =
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0;

    if (isModifiedClick) {
      // 让浏览器处理新标签页 / 新窗口等行为
      return;
    }

    if (pending) {
      const confirmed = window.confirm(
        "AI正在生成内容，离开当前对话可能会丢失正在生成的内容，确定要离开吗？"
      );
      if (!confirmed) {
        event.preventDefault();
        return;
      }
    }

    clear();
    resetPreview();
  };

  return { handleNewChat, pending };
}

