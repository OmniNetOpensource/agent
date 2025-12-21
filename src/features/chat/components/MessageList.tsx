"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { MessageItem } from "./message/MessageItem";
import { PendingIndicator } from "./message/PendingIndicator";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { Button } from "@/components/ui/button";

export function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const pending = useChatStore((state) => state.pending);
  const [isAtBottom, setIsAtBottom] = useState(true);

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
  }, []);

  const handleScrollToBottom = () => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "auto",
    });
    setIsAtBottom(true);
  };

  return (
    <div className="relative h-full w-full">
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

      {messages.length > 0 && !isAtBottom && (
        <div className="absolute bottom-32 md:bottom-36 left-0 right-0 flex justify-end px-3 sm:px-4 md:px-0 pointer-events-none z-(--z-sticky)">
          <div className="w-full md:w-[60%] mx-auto flex justify-end pr-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleScrollToBottom}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-xs shadow-md pointer-events-auto"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span>回到底部</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
