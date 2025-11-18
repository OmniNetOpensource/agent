"use client";

import { useEffect, useMemo, useRef } from "react";
import { Message } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { PendingIndicator } from "./PendingIndicator";

type MessageListProps = {
  messages: Message[];
  pending: boolean;
  onToggleResearchBlock: (messageIndex: number, blockIndex: number) => void;
  onToggleResearchItem: (
    messageIndex: number,
    blockIndex: number,
    itemIndex: number
  ) => void;
};

export function MessageList({
  messages,
  pending,
  onToggleResearchBlock,
  onToggleResearchItem,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const lastResearchSignature = useMemo<string | null>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== "assistant") {
        continue;
      }
      for (let blockIndex = message.blocks.length - 1; blockIndex >= 0; blockIndex--) {
        const block = message.blocks[blockIndex];
        if (block.type === "research") {
          return `${i}-${blockIndex}-${block.items.length}`;
        }
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (!lastResearchSignature) {
      return;
    }
    const el = containerRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [lastResearchSignature]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      role="log"
      aria-live="polite"
      ref={containerRef}
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
              onToggleResearchBlock={onToggleResearchBlock}
              onToggleResearchItem={onToggleResearchItem}
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
