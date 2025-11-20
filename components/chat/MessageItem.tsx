import { memo } from "react";
import Markdown from "@/components/Markdown";
import { Message } from "@/types/chat";
import { cx } from "@/utils/cx";
import { ResearchBlock } from "./ResearchBlock";

type MessageItemProps = {
  message: Message;
  index: number;
  isStreaming: boolean;
  onToggleResearchBlock: (messageIndex: number, blockIndex: number) => void;
  onToggleResearchItem: (
    messageIndex: number,
    blockIndex: number,
    itemIndex: number
  ) => void;
};

export const MessageItem = memo(function MessageItem({
  message,
  index,
  isStreaming,
  onToggleResearchBlock,
  onToggleResearchItem,
}: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div
      key={`${message.role}-${index}`}
      className={cx(
        "rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-sm p-6",
        "space-y-3",
        isUser
          ? "ml-auto bg-(--surface-user) shadow-none max-w-[720px]"
          : "mr-auto shadow-lg w-full"
      )}
    >

      {isUser ? (
        <div className="text-base leading-relaxed text-foreground">
          <Markdown
            content={
              message.blocks.find((b) => b.type === "content")?.content || ""
            }
          />
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          {message.blocks.map((block, blockIndex) => {
            const blockKey = `${index}-${blockIndex}`;
            if (block.type === "research") {
              return (
                <ResearchBlock
                  key={blockKey}
                  items={block.items}
                  blockIndex={blockIndex}
                  messageIndex={index}
                  isExpanded={block.isExpanded}
                  onToggleBlock={() => onToggleResearchBlock(index, blockIndex)}
                  onToggleItem={(itemIndex) =>
                    onToggleResearchItem(index, blockIndex, itemIndex)
                  }
                  isActive={isStreaming && blockIndex === message.blocks.length - 1}
                />
              );
            }

            return (
              <div
                key={blockKey}
                className="text-base leading-relaxed text-foreground"
              >
                <Markdown content={block.content} />
                {isStreaming && blockIndex === message.blocks.length - 1 && (
                  <span className="ml-1 inline-flex h-5 w-0.5 animate-pulse bg-(--color-accent) align-middle" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
