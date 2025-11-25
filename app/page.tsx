"use client";

import { Composer } from "@/src/features/chat/components/Composer";
import { Header } from "@/src/features/chat/components/Header";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { PreviewPanel } from "@/src/shared/components/PreviewPanel";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export function ChatPage() {
  const messages = useChatStore((state) => state.messages);
  const messageCount = messages.length;

  const isInitial = messageCount === 0;

  return (
    <div className="flex h-full w-full flex-col">
      <Header />
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 relative">
          <MessageList />
          <Composer isInitial={isInitial} />
        </div>
        <PreviewPanel />
      </main>
    </div>
  );
}

export default function Home() {
  return <ChatPage />;
}
