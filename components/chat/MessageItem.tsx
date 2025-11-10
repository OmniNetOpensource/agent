import Markdown from "@/components/Markdown";
import { Card } from "@/components/ui/Card";
import { Message } from "@/types/chat";
import { cx } from "@/utils/cx";
import { ResearchBlock } from "./ResearchBlock";

type MessageItemProps = {
  message: Message;
  index: number;
  isLastMessage: boolean;
  isStreaming: boolean;
  expandedResearch: Set<number>;
  expandedItems: Set<string>;
  onToggleResearch: (key: number) => void;
  onToggleItem: (key: string) => void;
};

export function MessageItem({
  message,
  index,
  isLastMessage,
  isStreaming,
  expandedResearch,
  expandedItems,
  onToggleResearch,
  onToggleItem,
}: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <Card
      key={`${message.role}-${index}`}
      className={cx(
        "max-w-[720px] space-y-3",
        isUser
          ? "ml-auto bg-(--surface-user) shadow-none"
          : "mr-auto shadow-lg"
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
                <ResearchBlock
                  key={blockKey}
                  items={block.items}
                  blockIndex={blockIndex}
                  messageIndex={index}
                  isExpanded={isResearchExpanded}
                  expandedItems={expandedItems}
                  onToggleBlock={() => onToggleResearch(researchKey)}
                  onToggleItem={onToggleItem}
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
    </Card>
  );
}
