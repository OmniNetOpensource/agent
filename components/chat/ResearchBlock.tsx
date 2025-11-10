import { Card } from "@/components/ui/Card";
import { cx } from "@/utils/cx";
import { ResearchItem } from "./ResearchItem";

type ResearchItemData =
  | { kind: "thinking"; text: string }
  | { kind: "tool_call"; tool: string; args: Record<string, unknown> }
  | { kind: "tool_result"; tool: string; result: string };

type ResearchBlockProps = {
  items: ResearchItemData[];
  blockIndex: number;
  messageIndex: number;
  isExpanded: boolean;
  expandedItems: Set<string>;
  onToggleBlock: () => void;
  onToggleItem: (key: string) => void;
};

export function ResearchBlock({
  items,
  blockIndex,
  messageIndex,
  isExpanded,
  expandedItems,
  onToggleBlock,
  onToggleItem,
}: ResearchBlockProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggleBlock}
        className="flex w-full items-center justify-between rounded-xl border border-(--border-subtle) bg-(--surface-muted) px-4 py-3 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--border-hover)"
      >
        <span
          className={cx(
            "text-sm transition-transform",
            isExpanded && "rotate-90"
          )}
        >
          ▶
        </span>
        <span className="flex-1 px-3 text-left">
          RESEARCHING... #{blockIndex + 1}
        </span>
        <span className="text-[0.65rem] tracking-[0.2em] text-(--text-tertiary)">
          {items.length} 条
        </span>
      </button>

      {isExpanded && (
        <Card
          padding="sm"
          className="mt-3 space-y-4 bg-(--surface-muted) shadow-none max-h-[320px] overflow-y-auto overscroll-contain"
        >
          {items.map((item, itemIndex) => {
            const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;
            const isItemExpanded = expandedItems.has(itemKey);

            return (
              <ResearchItem
                key={itemKey}
                item={item}
                itemKey={itemKey}
                isExpanded={isItemExpanded}
                onToggle={() => onToggleItem(itemKey)}
              />
            );
          })}
        </Card>
      )}
    </div>
  );
}
