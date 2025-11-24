import { MessageItem } from "./MessageItem";
import { PendingIndicator } from "./PendingIndicator";
import { useChatMessages } from "@/src/features/chat/hooks/useChat";

export function MessageList() {
  const { messages, pending } = useChatMessages();

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      role="log"
      aria-live="polite"
      className="h-full w-full overflow-y-auto py-6 pr-2 pb-32"
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
