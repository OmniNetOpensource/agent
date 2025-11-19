import { memo, useEffect, useRef } from "react";
import Markdown from "@/components/Markdown";
import type { ResearchItem as ResearchItemData } from "@/types/chat";
import { cx } from "@/utils/cx";

type ResearchBlockProps = {
  items: ResearchItemData[];
  blockIndex: number;
  messageIndex: number;
  isExpanded: boolean;
  onToggleBlock: () => void;
  onToggleItem: (itemIndex: number) => void;
};

type ResearchBlockItemProps = {
  item: ResearchItemData;
  itemKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  onScrollParent?: () => void;
};

const ResearchBlockItem = memo(function ResearchBlockItem({
  item,
  itemKey,
  isExpanded,
  onToggle,
  onScrollParent,
}: ResearchBlockItemProps) {
  const contentId = `research-item-${itemKey}`;

  const containerRef = useRef<HTMLDivElement | null>(null);

  const getHeaderText =
    item.kind === "thinking"
      ? "💭 Thinking"
      : item.kind === "tool_call"
      ? `🔧 ${item.tool}`
      : item.kind === "tool_result"
      ? `📊 ${item.tool} Result`
      : "";

  const content =
    item.kind === "thinking"
      ? item.text
      : item.kind === "tool_call"
      ? `\`\`\`json\n${JSON.stringify(item.args, null, 2)}\n\`\`\``
      : item.kind === "tool_result"
      ? item.result
      : "";

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const el = containerRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    }

    onScrollParent?.();
  }, [content]);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-(--surface-muted) px-3 py-2 text-xs font-semibold text-(--text-secondary) transition-colors hover:bg-(--surface-hover)"
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="flex-1 text-left">{getHeaderText ?? ""}</span>
        <span
          aria-hidden="true"
          className={cx(
            "text-sm transition-transform",
            isExpanded && "rotate-90"
          )}
        >
          ▶
        </span>
      </button>

      <div
        id={contentId}
        ref={containerRef}
        className={cx(
          "text-left max-h-[240px] overflow-y-auto overscroll-contain bg-(--surface-muted) p-4",
          !isExpanded && "hidden"
        )}
      >
        {isExpanded && <Markdown content={content} />}
      </div>
    </div>
  );
});

export const ResearchBlock = memo(function ResearchBlock({
  items,
  blockIndex,
  messageIndex,
  isExpanded,
  onToggleBlock,
  onToggleItem,
}: ResearchBlockProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scrollParentToBottom = () => {
    if (!isExpanded) {
      return;
    }

    const el = containerRef.current;
    if (!el) {
      return;
    }

    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={onToggleBlock}
        className="flex w-full items-center justify-between bg-(--surface-muted) px-4 py-3 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--surface-hover)"
        aria-expanded={isExpanded}
      >
        <span className="flex-1 px-3 text-left">RESEARCHING...</span>
        <span
          aria-hidden="true"
          className={cx(
            "text-sm transition-transform",
            isExpanded && "rotate-90"
          )}
        >
          ▶
        </span>
      </button>

      {isExpanded && (
        <div
          ref={containerRef}
          className="bg-(--surface-card) max-h-[320px] overflow-y-auto overscroll-contain"
        >
          {items.map((item, itemIndex) => {
            const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;

            return (
              <ResearchBlockItem
                key={itemKey}
                item={item}
                itemKey={itemKey}
                isExpanded={item.isExpanded}
                onToggle={() => onToggleItem(itemIndex)}
                onScrollParent={scrollParentToBottom}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
