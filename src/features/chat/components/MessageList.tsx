import { MessageItem } from "./message/MessageItem";
import { PendingIndicator } from "./message/PendingIndicator";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const pending = useChatStore((state) => state.pending);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      role="log"
      aria-live="polite"
      className="w-full py-6 pr-2 pb-32"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col space-y-4">
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
