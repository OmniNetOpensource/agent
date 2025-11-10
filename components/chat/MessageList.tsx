"use client";

import { useState, type ReactNode } from "react";
import Markdown from "@/components/Markdown";
import { Card } from "@/components/ui/Card";
import { Message } from "@/types/chat";
import { cx } from "@/utils/cx";
import { prettyPrintArgs, truncateToolResult } from "@/utils/chatFormat";

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
      className="flex-1 space-y-4 overflow-y-auto py-6 pr-2"
    >
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isLastMessage = index === messages.length - 1;
        const isStreaming = isLastMessage && pending;

        return (
          <Card
            key={`${message.role}-${index}`}
            className={cx(
              "max-w-[720px] space-y-3",
              isUser ? "ml-auto bg-neutral-50 shadow-none" : "mr-auto shadow-lg"
            )}
          >
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-(--text-tertiary)">
              {isUser ? "你" : "AI 助手"}
            </div>

            {isUser ? (
              <div className="text-base leading-relaxed text-foreground">
                <Markdown
                  content={
                    message.blocks.find((b) => b.type === "content")?.content || ""
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {message.blocks.map((block, blockIndex) => {
                  const blockKey = `${index}-${blockIndex}`;
                  if (block.type === "research") {
                    const researchKey = Number(`${index}${blockIndex}`);
                    const isResearchExpanded = expandedResearch.has(researchKey);
                    return (
                      <div key={blockKey}>
                        <button
                          type="button"
                          onClick={() => toggleResearch(researchKey)}
                          className="flex w-full items-center justify-between rounded-xl border border-(--border-subtle) bg-(--surface-muted) px-4 py-3 text-xs font-medium text-(--text-secondary) transition-colors hover:border-neutral-300"
                        >
                          <span
                            className={cx(
                              "text-sm transition-transform",
                              isResearchExpanded && "rotate-90"
                            )}
                          >
                            ▶
                          </span>
                          <span className="flex-1 px-3 text-left">
                            RESEARCHING... #{blockIndex + 1}
                          </span>
                          <span className="text-[0.65rem] tracking-[0.2em] text-(--text-tertiary)">
                            {block.items.length} 条
                          </span>
                        </button>

                        {isResearchExpanded && (
                          <Card
                            padding="sm"
                            className="mt-3 space-y-4 bg-(--surface-muted) shadow-none"
                          >
                            {block.items.map((item, itemIndex) => {
                              const itemKey = `${index}-${blockIndex}-${itemIndex}`;
                              const isItemExpanded = expandedItems.has(itemKey);
                              const contentId = `research-item-${itemKey}`;

                              let title = "Thinking";
                              let containerClasses =
                                "rounded-xl bg-white/80 px-4 py-3 text-sm text-(--text-secondary)";
                              let contentBody: ReactNode = null;

                              if (item.kind === "thinking") {
                                title = "Thinking";
                                containerClasses =
                                  "rounded-xl bg-white/80 px-4 py-3 text-sm text-(--text-secondary)";
                                contentBody = <Markdown content={item.text} />;
                              } else if (item.kind === "tool_call") {
                                title = `Tool Call · ${item.tool}`;
                                containerClasses =
                                  "rounded-xl border border-dashed border-(--border-subtle) bg-white/80 px-4 py-3 text-xs text-(--text-secondary)";
                                contentBody = (
                                  <pre className="mt-2 overflow-x-auto font-mono text-[0.75rem] text-neutral-700">
                                    {prettyPrintArgs(item.args)}
                                  </pre>
                                );
                              } else if (item.kind === "tool_result") {
                                title = `Tool Result · ${item.tool}`;
                                containerClasses =
                                  "rounded-xl border border-(--border-subtle) bg-white px-4 py-3 text-xs text-neutral-800";
                                const truncated = truncateToolResult(item.result);
                                const isTruncated = truncated !== item.result;

                                contentBody = (
                                  <>
                                    <pre className="mt-2 whitespace-pre-wrap font-mono text-[0.75rem] text-neutral-800">
                                      {truncated}
                                    </pre>
                                    {isTruncated && (
                                      <div className="mt-2 text-[0.6rem] uppercase tracking-[0.2em] text-(--text-tertiary)">
                                        已截断
                                      </div>
                                    )}
                                  </>
                                );
                              } else {
                                return null;
                              }

                              return (
                                <div
                                  key={itemKey}
                                  className={cx("space-y-3", containerClasses)}
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleItem(itemKey)}
                                    className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-(--surface-muted) px-3 py-2 text-xs font-semibold text-(--text-secondary) transition-colors hover:border-neutral-300"
                                    aria-expanded={isItemExpanded}
                                    aria-controls={contentId}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className={cx(
                                        "text-sm transition-transform",
                                        isItemExpanded && "rotate-90"
                                      )}
                                    >
                                      ▶
                                    </span>
                                    <span className="flex-1 text-left">
                                      {title}
                                    </span>
                                  </button>

                                  <div
                                    id={contentId}
                                    className={cx(
                                      "text-left",
                                      !isItemExpanded && "hidden"
                                    )}
                                  >
                                    {isItemExpanded && contentBody}
                                  </div>
                                </div>
                              );
                            })}
                          </Card>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={blockKey}
                      className="text-base leading-relaxed text-foreground"
                    >
                      <Markdown content={block.content} />
                      {isStreaming && blockIndex === message.blocks.length - 1 && (
                        <span className="ml-1 inline-flex h-5 w-0.5 animate-pulse bg-neutral-400 align-middle" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {pending && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start">
          <Card padding="sm" className="flex items-center gap-3 shadow-none">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-(--text-tertiary)">
              AI 助手
            </span>
            <span className="flex gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
          </Card>
        </div>
      )}
    </div>
  );
}
