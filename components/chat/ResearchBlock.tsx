import { memo, useEffect, useMemo, useRef } from "react";
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
};

const ResearchBlockItem = memo(function ResearchBlockItem({
  item,
  itemKey,
  isExpanded,
  onToggle,
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

  const getContent =
    item.kind === "thinking"
      ? item.text
      : item.kind === "tool_call"
      ? `\`\`\`json\n${JSON.stringify(item.args, null, 2)}\n\`\`\``
      : item.kind === "tool_result"
      ? item.result
      : undefined;

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
  }, [getContent]);

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
        {isExpanded && <Markdown content={getContent ?? ""} />}
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

  const lastItemSignature = useMemo<string | null>(() => {
    if (!items.length) {
      return null;
    }
    return `${messageIndex}-${blockIndex}-${items.length}`;
  }, [items.length, messageIndex, blockIndex]);

  useEffect(() => {
    if (!isExpanded || !lastItemSignature) {
      return;
    }
    const el = containerRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [isExpanded, lastItemSignature]);

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
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
