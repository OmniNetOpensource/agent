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
  itemIndex: number;
  items: ResearchItemData[];
};

const ResearchBlockItem = memo(function ResearchBlockItem({
  item,
  itemKey,
  itemIndex,
  items,
}: ResearchBlockItemProps) {
  // Handle thinking
  if (item.kind === "thinking") {
    return <ThinkingItem item={item} itemKey={itemKey} />;
  }

  // Handle tool calls - each tool component handles its own result/progress
  if (item.kind === "tool_call") {
    switch (item.tool) {
      case "fetch_url":
        return <FetchUrl item={item} items={items} itemIndex={itemIndex} />;
      case "brave_search":
        return <BraveSearch item={item} items={items} itemIndex={itemIndex} />;
      default:
        // Development warning for missing tool UI
        if (process.env.NODE_ENV === "development") {
          console.error(
            `[ResearchBlock] No UI component registered for tool: ${item.tool}`
          );
        }
        return (
          <div className="px-4 py-2 text-xs text-(--color-destructive) font-mono border-l-2 border-(--color-destructive) bg-(--surface-muted)">
            ⚠️ Missing UI for tool: <strong>{item.tool}</strong>
          </div>
        );
    }
  }

  // tool_result and tool_progress are handled by their respective tool_call components
  // If we reach here, it means the item wasn't consumed by its tool component
  if (item.kind === "tool_result" || item.kind === "tool_progress") {
    const prevItem = items[itemIndex - 1];
    // Only hide if the previous item is the matching tool_call
    if (prevItem?.kind === "tool_call" && prevItem.tool === item.tool) {
      return null;
    }

    // Orphaned result/progress - show warning in development
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[ResearchBlock] Orphaned ${item.kind} for tool: ${item.tool}`
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

  // Count stats
  const thinkingCount = items.filter((i) => i.kind === "thinking").length;
  const toolCount = items.filter((i) => i.kind === "tool_call").length;

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-(--border-subtle) bg-background shadow-soft">
      {/* Top Decor Bar */}
      <div
        className={cx(
          "h-0.5 w-full transition-colors duration-500",
          isActive
            ? "bg-linear-to-r from-(--color-brand) via-(--color-info) to-(--color-brand) bg-size-[200%_100%] animate-shimmer"
            : "bg-(--border-subtle)"
        )}
      />

      <button
        type="button"
        onClick={toggleBlock}
        className={cx(
          "flex w-full items-center justify-between px-4 py-3 transition-all hover:bg-(--surface-hover)",
          isActive && "bg-(--surface-hover)"
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div
            className={cx(
              "flex h-7 w-7 items-center justify-center rounded-lg shadow-sm transition-all duration-300 border",
              isActive
                ? "bg-(--surface-card) text-(--color-brand) border-(--color-brand)"
                : "bg-(--surface-muted) text-(--text-tertiary) border-(--border-subtle)"
            )}
          >
            {isActive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cpu className="h-4 w-4" />
            )}
          </div>

          <div className="flex flex-col items-start">
            <span
              className={cx(
                "text-xs font-bold uppercase tracking-widest font-mono",
                isActive ? "text-(--color-brand)" : "text-(--text-tertiary)"
              )}
            >
              {isActive ? "PROCESSING_TASK..." : "TASK_COMPLETED"}
            </span>
            {!isExpanded && items.length > 0 && (
              <div className="flex items-center gap-2 text-[10px] text-(--text-tertiary) font-mono mt-0.5">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" /> {thinkingCount} OPS
                </span>
                <span>|</span>
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> {toolCount} TOOLS
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          className={cx(
            "flex h-6 w-6 items-center justify-center rounded bg-(--surface-muted) border border-(--border-subtle) transition-all duration-200 hover:bg-(--surface-hover)",
            isExpanded && "rotate-90 bg-(--surface-hover) text-foreground"
          )}
        >
          <ChevronRight className="h-4 w-4 text-current" />
        </div>
      </button>

      <div
        className={cx(
          "transition-all duration-500 cubic-bezier(0.32,0.72,0,1)",
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="max-h-[500px] overflow-y-auto overscroll-contain border-t border-(--border-subtle) bg-(--surface-alt)">
          {items.map((item, itemIndex) => {
            const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;
            return (
              <ResearchBlockItem
                key={itemKey}
                item={item}
                itemKey={itemKey}
                itemIndex={itemIndex}
                items={items}
              />
            );
          })}
          {isActive && (
            <div className="flex items-center gap-3 p-4 text-xs font-mono text-(--text-secondary)">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--text-tertiary) opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-(--text-secondary)"></span>
              </span>
              <span className="animate-pulse">
                AI_AGENT_ANALYZING_DATA_STREAM...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
