import { memo, useState } from "react";
import type { ResearchItem as ResearchItemData } from "@/src/features/chat/types/chat";
import { cx } from "@/src/shared/utils/cx";
import { FetchUrl } from "./tools/FetchUrl";
import { BraveSearch } from "./tools/BraveSearch";
import { ThinkingItem } from "./tools/ThinkingItem";
import { Activity, ChevronRight, Loader2, Wrench, Cpu } from "lucide-react";

type ResearchBlockProps = {
  items: ResearchItemData[];
  blockIndex: number;
  messageIndex: number;
  isActive?: boolean;
};

type ResearchBlockItemProps = {
  item: ResearchItemData;
  itemKey: string;
};

const ResearchBlockItem = memo(function ResearchBlockItem({
  item,
  itemKey,
}: ResearchBlockItemProps) {
  // Handle thinking
  if (item.kind === "thinking") {
    return <ThinkingItem item={item} itemKey={itemKey} />;
  }

  // Handle tool calls - each tool component handles its own result/progress
  if (item.kind === "tool") {
    const toolName = item.data.call.tool;

    switch (toolName) {
      case "fetch_url":
        return <FetchUrl tool={item.data} />;
      case "brave_search":
        return <BraveSearch tool={item.data} />;
      default:
        if (process.env.NODE_ENV === "development") {
          console.error(
            `[ResearchBlock] No UI component registered for tool: ${toolName}`
          );
        }
        return (
          <div className="px-4 py-2 text-xs text-(--color-destructive) font-mono border-l-2 border-(--color-destructive) bg-(--surface-muted)">
            ⚠️ Missing UI for tool: <strong>{toolName}</strong>
          </div>
        );
    }
  }

  return null;
});

export const ResearchBlock = memo(function ResearchBlock({
  items,
  blockIndex,
  messageIndex,
  isActive,
}: ResearchBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleBlock = () => setIsExpanded((prev) => !prev);

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-(--border-subtle) bg-background">
      <button
        type="button"
        onClick={toggleBlock}
        className={cx(
          "flex w-full items-center justify-between px-3 py-2 transition-all hover:bg-(--surface-hover)",
          isActive && "bg-(--surface-hover)"
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <div
            className={cx(
              "flex h-5 w-5 items-center justify-center text-(--text-tertiary)",
              isActive && "text-(--color-brand)"
            )}
          >
            {isActive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cpu className="h-4 w-4" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cx(
                "text-sm font-medium",
                isActive ? "text-foreground" : "text-(--text-secondary)"
              )}
            >
              {isActive ? "Researching..." : "Research completed"}
            </span>
            {!isExpanded && items.length > 0 && (
              <span className="text-xs text-(--text-tertiary)">
                ({items.length} steps)
              </span>
            )}
          </div>
        </div>

        <div
          className={cx(
            "flex h-5 w-5 items-center justify-center text-(--text-tertiary) transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>

      <div
        className={cx(
          "transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="max-h-[500px] overflow-y-auto overscroll-contain border-t border-(--border-subtle) bg-(--surface-alt)">
          {items.map((item, itemIndex) => {
            const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;
            return (
              <ResearchBlockItem key={itemKey} item={item} itemKey={itemKey} />
            );
          })}
          {isActive && (
            <div className="flex items-center gap-2 p-3 text-xs text-(--text-tertiary)">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
