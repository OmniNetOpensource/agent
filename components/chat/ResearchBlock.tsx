import { memo, useEffect, useRef } from "react";
import Markdown from "@/components/Markdown";
import type { ResearchItem as ResearchItemData } from "@/types/chat";
import { cx } from "@/utils/cx";
import { 
  Brain, 
  Wrench, 
  FileText, 
  ChevronRight, 
  Loader2, 
  Sparkles,
  Terminal
} from "lucide-react";

type ResearchBlockProps = {
  items: ResearchItemData[];
  blockIndex: number;
  messageIndex: number;
  isExpanded: boolean;
  onToggleBlock: () => void;
  onToggleItem: (itemIndex: number) => void;
  isActive?: boolean;
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

  const getIcon = () => {
    switch (item.kind) {
      case "thinking":
        return <Brain className="h-3.5 w-3.5" />;
      case "tool_call":
        return <Wrench className="h-3.5 w-3.5" />;
      case "tool_result":
        return <FileText className="h-3.5 w-3.5" />;
      default:
        return <Terminal className="h-3.5 w-3.5" />;
    }
  };

  const getTitle = () => {
    switch (item.kind) {
      case "thinking":
        return "思考过程";
      case "tool_call":
        return `调用工具: ${item.tool}`;
      case "tool_result":
        return `工具返回: ${item.tool}`;
      default:
        return "未知操作";
    }
  };

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
  }, [content, isExpanded, onScrollParent]);

  return (
    <div className="group border-b border-(--border-subtle) last:border-0 animate-enter-down">
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "flex w-full items-center gap-3 px-4 py-3 text-xs transition-colors hover:bg-(--surface-hover)",
          isExpanded ? "bg-(--surface-hover)" : "bg-(--surface-card)"
        )}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className={cx(
          "flex items-center justify-center rounded-md p-1 transition-colors",
          item.kind === "thinking" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          item.kind === "tool_call" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          item.kind === "tool_result" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        )}>
          {getIcon()}
        </div>
        
        <span className="flex-1 text-left font-medium text-(--text-secondary)">
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
        ref={containerRef}
        className={cx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="overflow-x-auto bg-(--surface-muted) p-4 text-xs">
          <Markdown content={content} />
        </div>
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
  isActive,
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

  // Count stats
  const thinkingCount = items.filter(i => i.kind === 'thinking').length;
  const toolCount = items.filter(i => i.kind === 'tool_call').length;

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-card)/50 shadow-soft backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggleBlock}
        className={cx(
          "flex w-full items-center justify-between px-4 py-3 transition-all hover:bg-(--surface-hover)",
          isActive && "bg-blue-50/30 dark:bg-blue-900/10"
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className={cx(
            "flex h-6 w-6 items-center justify-center rounded-full shadow-sm ring-1 ring-inset",
            isActive 
              ? "bg-white text-blue-600 ring-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-900" 
              : "bg-white text-(--text-secondary) ring-(--border-subtle) dark:bg-(--surface-muted)"
          )}>
            {isActive ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </div>
          
          <div className="flex flex-col items-start">
            <span className={cx(
              "text-xs font-bold uppercase tracking-wider",
              isActive ? "text-blue-600 dark:text-blue-400" : "text-(--text-secondary)"
            )}>
              {isActive ? "正在思考..." : "思考过程"}
            </span>
            {!isExpanded && items.length > 0 && (
              <span className="text-[10px] text-(--text-tertiary) font-medium">
                {thinkingCount} 步骤 · {toolCount} 工具
              </span>
            )}
          </div>
        </div>

        <div className={cx(
          "flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 hover:bg-(--surface-hover)",
          isExpanded && "rotate-90 bg-(--surface-hover)"
        )}>
            <ChevronRight className="h-4 w-4 text-(--text-tertiary)" />
        </div>
      </button>

      <div
        className={cx(
          "transition-all duration-500 cubic-bezier(0.32,0.72,0,1)",
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div 
          ref={containerRef}
          className="max-h-[500px] overflow-y-auto overscroll-contain border-t border-(--border-subtle) bg-(--surface-alt)/30"
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
          {isActive && (
            <div className="flex items-center gap-2 p-4 text-xs text-(--text-tertiary) animate-pulse">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>AI 正在分析...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
