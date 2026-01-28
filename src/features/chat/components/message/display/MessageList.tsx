"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { MessageItem } from "./MessageItem";
import { PendingIndicator } from "./PendingIndicator";
import {
  useChatRequestStore,
  useMessageTreeStore,
} from "@/src/features/chat/store";
import { computeMessagesFromPath } from "@/src/features/chat/lib/tree";
import { Button } from "@/components/ui/button";

export function MessageList() {
  const allMessages = useMessageTreeStore((state) => state.messages);
  const currentPath = useMessageTreeStore((state) => state.currentPath);
  const messages = computeMessagesFromPath(allMessages, currentPath);
  const pending = useChatRequestStore((state) => state.pending);
  const getBranchInfo = useMessageTreeStore((state) => state.getBranchInfo);
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
      if(atBottom !== isAtBottom) {
        setIsAtBottom(atBottom);
      }
    };

    // 初始化时同步一次状态
    handleScroll();

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [messages, isAtBottom]);

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
          className="flex-1 min-h-0 flex flex-col py-4 px-3 sm:px-4 md:px-0 pb-44 md:pb-52 mx-auto w-full md:w-[50%] space-y-2 md:space-y-3"
        >
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const isStreaming = isLastMessage && pending;
            const messageId = message.id;
            const depth = index + 1;
            const branchInfo = getBranchInfo(messageId);

            return (
              <MessageItem
                key={messageId}
                message={message}
                messageId={messageId}
                index={index}
                depth={depth}
                isStreaming={isStreaming}
                branchInfo={branchInfo}
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
          <div className="w-full md:w-[50%] mx-auto flex justify-end pr-1">
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
