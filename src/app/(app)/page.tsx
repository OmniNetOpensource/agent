"use client";

import { useEffect } from "react";
import { Composer } from "@/src/features/chat/components/Composer";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export default function HomePage() {
  const messages = useChatStore((state) => state.messages);
  const clear = useChatStore((state) => state.clear);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    clear();
  }, [clear]);

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
