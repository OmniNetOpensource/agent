"use client";

"use client";

import { useEffect, useRef } from "react";
import { MessageItem } from "./message/MessageItem";
import { PendingIndicator } from "./message/PendingIndicator";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const pending = useChatStore((state) => state.pending);
  const setIsAtBottom = useChatStore((state) => state.setIsAtBottom);
  const registerScrollToBottom = useChatStore(
    (state) => state.registerScrollToBottom
  );
  const isAtBottom = useChatStore((state) => state.isAtBottom);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
      const atBottom = distanceToBottom <= 32;
      setIsAtBottom(atBottom);
    };

    // 初始化时同步一次状态
    handleScroll();

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [setIsAtBottom]);

  useEffect(() => {
    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
      const container = scrollRef.current;
      if (!container) {
        return;
      }
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    };

    registerScrollToBottom(() => scrollToBottom("auto"));

    return () => {
      registerScrollToBottom(null);
    };
  }, [registerScrollToBottom]);

  useEffect(() => {
    if (!isAtBottom) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "auto",
    });
  }, [messages.length, pending, isAtBottom]);

  return (
    <div ref={scrollRef} className="h-full w-full overflow-y-auto">
      <div
        role="log"
        aria-live="polite"
        className="flex-1 min-h-0 flex flex-col py-6 px-3 sm:px-4 md:px-0 pb-44 md:pb-52 mx-auto w-full md:w-[60%] space-y-3 md:space-y-4"
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
