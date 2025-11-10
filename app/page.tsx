"use client";

import Sidebar from "@/components/Sidebar";
import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { useChat } from "@/hooks/useChat";

export default function Home() {
  const {
    messages,
    input,
    pending,
    setInput,
    handleSubmit,
    handleKeyDown,
    clearConversation,
  } = useChat();

  const isInitial = messages.length === 0;
  const canClearConversation = !pending && !isInitial;

  const handleClearConversation = () => {
    if (!canClearConversation) {
      return;
    }
    clearConversation();
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        canClearConversation={canClearConversation}
        onClear={handleClearConversation}
      />
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 py-6 md:px-8">
          <main className="flex flex-1 flex-col min-h-0">
            {!isInitial && (
              <MessageList messages={messages} pending={pending} />
            )}
            <Composer
              input={input}
              setInput={setInput}
              pending={pending}
              onSubmit={handleSubmit}
              onKeyDown={handleKeyDown}
              isInitial={isInitial}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
