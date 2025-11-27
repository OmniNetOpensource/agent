"use client";

import { useEffect } from "react";
import { Composer } from "@/src/features/chat/components/Composer";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export default function Home() {
  const messages = useChatStore((state) => state.messages);
  const clear = useChatStore((state) => state.clear);
  const messageCount = messages.length;

  useEffect(() => {
    clear();
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative">
          {messageCount > 0 && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <MessageList />
            </div>
          )}
          <Composer isNewchat />
        </div>
        <PreviewPanel />
      </main>
    </div>
  );
}
