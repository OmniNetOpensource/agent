"use client";

import { useState } from "react";
import { Message } from "@/types/chat";
import { useAutoExpandResearch } from "@/hooks/useAutoExpandResearch";
import { MessageItem } from "./MessageItem";
import { PendingIndicator } from "./PendingIndicator";

type MessageListProps = {
  messages: Message[];
  pending: boolean;
};

export function MessageList({ messages, pending }: MessageListProps) {
  const [expandedResearch, setExpandedResearch] = useState<Set<number>>(
    () => new Set()
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    () => new Set()
  );

  const containerRef = useAutoExpandResearch(
    messages,
    expandedResearch,
    expandedItems,
    setExpandedResearch,
    setExpandedItems
  );

  if (messages.length === 0) {
    return null;
  }

  const toggleResearch = (key: number) => {
    setExpandedResearch((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div
      role="log"
      aria-live="polite"
      ref={containerRef}
      className="flex-1 space-y-4 overflow-y-auto py-6 pr-2"
    >
      {messages.map((message, index) => {
        const isLastMessage = index === messages.length - 1;
        const isStreaming = isLastMessage && pending;

        return (
          <MessageItem
            key={`${message.role}-${index}`}
            message={message}
            index={index}
            isLastMessage={isLastMessage}
            isStreaming={isStreaming}
            expandedResearch={expandedResearch}
            expandedItems={expandedItems}
            onToggleResearch={toggleResearch}
            onToggleItem={toggleItem}
          />
        );
      })}

      {pending && messages[messages.length - 1]?.role === "user" && (
        <PendingIndicator />
      )}
    </div>
  );
}
