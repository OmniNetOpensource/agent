import { memo, useState } from "react";
import Image from "next/image";
import Markdown from "@/src/shared/components/Markdown";
import { Message } from "@/src/features/chat/types/chat";
import { cx } from "@/src/shared/utils/cx";
import { formatFileSize } from "@/src/shared/utils/file";
import { ResearchBlock } from "./research/ResearchBlock";
import { Copy, Check, Paperclip } from "lucide-react";

type MessageItemProps = {
  message: Message;
  index: number;
  isStreaming: boolean;
};

export const MessageItem = memo(function MessageItem({
  message,
  index,
  isStreaming,
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
          ? "ml-auto max-w-[90%] sm:max-w-[85%]"
          : "mr-auto w-full max-w-[95%]"
      )}
    >
      <div
        className={cx(
          "rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 transition-all",
          isUser ? "bg-(--surface-user) text-foreground" : "bg-transparent"
        )}
      >
        {isUser ? (
          <div className="flex flex-col space-y-4">
            {message.blocks.map((block, blockIndex) => {
              const blockKey = `${index}-${blockIndex}`;

              if (block.type === "content") {
                return (
                  <div
                    key={blockKey}
                    className="text-base leading-relaxed text-foreground"
                  >
                    <Markdown content={block.content} />
                  </div>
                );
              }

              if (block.type === "attachments") {
                return (
                  <div key={blockKey} className="flex flex-wrap gap-3">
                    {block.attachments.map((attachment) =>
                      attachment.kind === "image" ? (
                        <div
                          key={attachment.id}
                          className="relative max-w-full overflow-hidden rounded-xl"
                        >
                          <Image
                            src={attachment.dataUrl}
                            alt={attachment.name}
                            width={400}
                            height={300}
                            className="max-h-[300px] w-auto rounded-xl object-contain"
                          />
                        </div>
                      ) : (
                        <div
                          key={attachment.id}
                          className="flex min-w-[220px] flex-1 items-center gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) px-3 py-2"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-(--border-subtle) bg-background text-(--text-tertiary)">
                            <Paperclip className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-foreground">
                              {attachment.name}
                            </div>
                            <div className="text-xs text-(--text-tertiary)">
                              {formatFileSize(attachment.size)}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              }

              return null;
            })}
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
                    isActive={
                      isStreaming && blockIndex === message.blocks.length - 1
                    }
                  />
                );
              }

              if (block.type === "attachments") {
                return null;
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
