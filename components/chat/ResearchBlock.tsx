import type { ResearchItem as ResearchItemData } from "@/types/chat";
import { ResearchItem } from "./ResearchItem";
import { cx } from "@/utils/cx";

type ResearchBlockProps = {
  items: ResearchItemData[];
  blockIndex: number;
  messageIndex: number;
  isExpanded: boolean;
  onToggleBlock: () => void;
  onToggleItem: (itemIndex: number) => void;
};

export function ResearchBlock({
  items,
  blockIndex,
  messageIndex,
  isExpanded,
  onToggleBlock,
  onToggleItem,
}: ResearchBlockProps) {
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
        <div className="bg-(--surface-card) max-h-[320px] overflow-y-auto overscroll-contain">
          {" "}
          {items.map((item, itemIndex) => {
            const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;

            return (
              <ResearchItem
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
}
