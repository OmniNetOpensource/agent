"use client";

import { useEffect } from "react";
import { Composer } from "@/src/features/chat/components/composer/Composer";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { usePreviewStore } from "@/src/features/preview/store/usePreviewStore";

export default function HomePage() {
  const messages = useChatStore((state) => state.messages);
  const clear = useChatStore((state) => state.clear);
  const resetPreview = usePreviewStore((state) => state.resetPreview);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    clear();
    resetPreview();
  }, [clear, resetPreview]);

  return (
    <div className="flex h-full w-full flex-col">
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative">
          {hasMessages && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <MessageList />
              </div>
            </div>
          )}
          <Composer />
        </div>
        <PreviewPanel />
      </main>
    </div>
  );
}
