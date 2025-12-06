"use client";

import { MessageItem } from "./message/MessageItem";
import { PendingIndicator } from "./message/PendingIndicator";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const pending = useChatStore((state) => state.pending);

  return (
    <div className="h-full w-full overflow-y-auto">
      <div
        role="log"
        aria-live="polite"
        className="flex-1 min-h-0 flex flex-col overflow-y-auto py-6 px-3 sm:px-4 md:px-0 pb-44 md:pb-52 mx-auto w-[90%] md:w-[60%] space-y-3 md:space-y-4"
      >
        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1;
          const isStreaming = isLastMessage && pending;

          return (
            <MessageItem
              key={`${message.role}-${index}`}
              message={message}
              index={index}
              isStreaming={isStreaming}
            />
          );
        })}

        {pending && messages[messages.length - 1]?.role === "user" && (
          <PendingIndicator />
        )}
      </div>
    </div>
  );
}
