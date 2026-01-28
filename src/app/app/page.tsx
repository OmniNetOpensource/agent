"use client";

import { useEffect } from "react";
import { Composer } from "@/src/features/chat/components/composer/Composer";
import { MessageList } from "@/src/features/chat/components/message/display/MessageList";
import { clearAllChatStores, useMessageTreeStore } from "@/src/features/chat/store";
import { usePreviewStore } from "@/src/features/preview/store/usePreviewStore";

export default function HomePage() {
  const messages = useMessageTreeStore((state) => state.messages);
  const resetPreview = usePreviewStore((state) => state.reset);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    clearAllChatStores();
    resetPreview();
  }, [resetPreview]);

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
      </main>
    </div>
  );
}
