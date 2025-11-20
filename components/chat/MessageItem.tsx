import { memo, useState } from "react";
import Markdown from "@/components/Markdown";
import { Message } from "@/types/chat";
import { cx } from "@/utils/cx";
import { ResearchBlock } from "./ResearchBlock";
import { Copy, Check } from "lucide-react";

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
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    const text = message.blocks
      .filter((b) => b.type === "content")
      .map((b) => b.content)
      .join("\n\n");

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div
      key={`${message.role}-${index}`}
      className={cx(
        "flex flex-col space-y-2",
        isUser
          ? "ml-auto max-w-[720px]"
          : "mr-auto w-full"
      )}
    >
      <div
        className={cx(
          "rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-sm p-6",
          "space-y-3",
          isUser
            ? "bg-(--surface-user) shadow-none"
            : "shadow-lg"
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

      <div className="flex items-center justify-end px-1">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="复制内容"
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {isCopied ? "已复制" : "复制"}
        </button>
      </div>
    </div>
  );
});
