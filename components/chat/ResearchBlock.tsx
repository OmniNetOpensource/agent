import { memo, useState } from "react";
import Markdown from "@/components/Markdown";
import type { ResearchItem as ResearchItemData } from "@/types/chat";
import { cx } from "@/utils/cx";
import { FetchUrlItem } from "./FetchUrlItem";
import { BraveSearchItem } from "./BraveSearchItem";
import {
  Activity,
  Brain,
  Wrench,
  FileText,
  ChevronRight,
  Loader2,
  Terminal,
  Cpu,
} from "lucide-react";

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
  const contentId = `research-item-${itemKey}`;
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleItem = () => setIsExpanded((prev) => !prev);

  // Handle fetch_url tool visualization
  if (item.kind === "tool_call" && item.tool === "fetch_url") {
    return (
      <FetchUrlItem
        item={item}
        items={items}
        itemIndex={itemIndex}
        isExpanded={isExpanded}
        onToggle={toggleItem}
      />
    );
  }

  // Hide fetch_url result as it's handled by the call item
  if (item.kind === "tool_result" && item.tool === "fetch_url") {
    const prevItem = items[itemIndex - 1];
    if (prevItem?.kind === "tool_call" && prevItem.tool === "fetch_url") {
      return null;
    }
  }

  // Hide fetch_url progress since it's grouped with the call item
  if (item.kind === "tool_progress" && item.tool === "fetch_url") {
    const prevItem = items[itemIndex - 1];
    if (prevItem?.kind === "tool_call" && prevItem.tool === "fetch_url") {
      return null;
    }
  }

  // Handle brave_search tool visualization
  if (item.kind === "tool_call" && item.tool === "brave_search") {
    return (
      <BraveSearchItem item={item} items={items} itemIndex={itemIndex} />
    );
  }

  // Hide brave_search result as it's handled by the call item
  if (item.kind === "tool_result" && item.tool === "brave_search") {
    const prevItem = items[itemIndex - 1];
    if (prevItem?.kind === "tool_call" && prevItem.tool === "brave_search") {
      return null;
    }
  }

  const getIcon = () => {
    switch (item.kind) {
      case "thinking":
        return <Brain className="h-3.5 w-3.5" />;
      case "tool_call":
        return <Wrench className="h-3.5 w-3.5" />;
      case "tool_result":
        return <FileText className="h-3.5 w-3.5" />;
      case "tool_progress":
        return <Activity className="h-3.5 w-3.5" />;
      default:
        return <Terminal className="h-3.5 w-3.5" />;
    }
  };

  const getTitle = () => {
    switch (item.kind) {
      case "thinking":
        return "THOUGHT_PROCESS";
      case "tool_call":
        return `EXEC_TOOL: ${item.tool}`;
      case "tool_result":
        return `RETURN_VAL: ${item.tool}`;
      case "tool_progress":
        return `PROGRESS: ${item.tool}`;
      default:
        return "UNKNOWN_OP";
    }
  };

  const content =
    item.kind === "thinking"
      ? item.text
      : item.kind === "tool_call"
      ? `\`\`\`json\n${JSON.stringify(item.args, null, 2)}\n\`\`\``
      : item.kind === "tool_result"
      ? item.result
      : item.kind === "tool_progress"
      ? `${item.stage}: ${item.message}`
      : "";

  const renderedContent = (
    <div className="overflow-x-auto bg-(--surface-muted) p-4 text-xs font-mono text-(--text-secondary) border-t border-(--border-subtle)">
      <Markdown content={content} />
    </div>
  );

  return (
    <div className="group border-b border-(--border-subtle) last:border-0 animate-enter-down">
      <button
        type="button"
        onClick={toggleItem}
        className={cx(
          "flex w-full items-center gap-3 px-4 py-3 text-xs transition-colors hover:bg-(--surface-hover)",
          isExpanded ? "bg-(--surface-hover)" : "bg-transparent"
        )}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className={cx(
          "flex items-center justify-center rounded-md p-1 transition-colors border",
          item.kind === "thinking" && "bg-(--surface-card) text-foreground border-(--border-strong)",
          item.kind === "tool_call" && "bg-(--surface-card) text-(--text-secondary) border-(--border-subtle)",
          item.kind === "tool_result" && "bg-(--surface-card) text-(--text-tertiary) border-(--border-subtle)"
        )}>
          {getIcon()}
        </div>

        <span className="flex-1 text-left font-mono font-medium text-(--text-secondary) tracking-tight">
          {getTitle()}
        </span>

        <ChevronRight
          className={cx(
            "h-3.5 w-3.5 text-(--text-tertiary) transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
      </button>

      <div
        id={contentId}
        className={cx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {renderedContent}
      </div>
    </div>
  );
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
      <div className={cx(
         "h-0.5 w-full transition-colors duration-500",
         isActive ? "bg-linear-to-r from-(--color-brand) via-(--color-info) to-(--color-brand) bg-size-[200%_100%] animate-shimmer" : "bg-(--border-subtle)"
      )} />
      
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
          <div className={cx(
            "flex h-7 w-7 items-center justify-center rounded-lg shadow-sm transition-all duration-300 border",
            isActive
              ? "bg-(--surface-card) text-(--color-brand) border-(--color-brand)"
              : "bg-(--surface-muted) text-(--text-tertiary) border-(--border-subtle)"
          )}>
            {isActive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cpu className="h-4 w-4" />
            )}
          </div>

          <div className="flex flex-col items-start">
            <span className={cx(
              "text-xs font-bold uppercase tracking-widest font-mono",
              isActive ? "text-(--color-brand)" : "text-(--text-tertiary)"
            )}>
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

        <div className={cx(
          "flex h-6 w-6 items-center justify-center rounded bg-(--surface-muted) border border-(--border-subtle) transition-all duration-200 hover:bg-(--surface-hover)",
          isExpanded && "rotate-90 bg-(--surface-hover) text-foreground"
        )}>
          <ChevronRight className="h-4 w-4 text-current" />
        </div>
      </button>

      <div
        className={cx(
          "transition-all duration-500 cubic-bezier(0.32,0.72,0,1)",
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div
          className="max-h-[500px] overflow-y-auto overscroll-contain border-t border-(--border-subtle) bg-(--surface-alt)"
        >
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
              <span className="animate-pulse">AI_AGENT_ANALYZING_DATA_STREAM...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
