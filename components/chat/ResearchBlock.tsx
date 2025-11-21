import { memo } from "react";
import Markdown from "@/components/Markdown";
import { useChatStore } from "@/store/useChatStore";
import type { ResearchItem as ResearchItemData } from "@/types/chat";
import { cx } from "@/utils/cx";
import { SearchResultCard } from "./SearchResultCard";
import { FetchTerminal } from "./FetchTerminal";
import {
  Brain,
  Wrench,
  FileText,
  ChevronRight,
  Loader2,
  Terminal,
  Activity,
  Cpu,
  Search,
  Zap,
} from "lucide-react";

type BraveSearchResult = {
  title: string;
  url: string;
  description: string;
};

const parseBraveSearchResults = (
  rawResult: string
): BraveSearchResult[] | null => {
  try {
    const data = JSON.parse(rawResult);
    const rawResults =
      (Array.isArray(data?.results) && data.results) ||
      (Array.isArray(data?.rawResults) && data.rawResults) ||
      (Array.isArray(data?.web?.results) && data.web.results) ||
      [];

    if (!Array.isArray(rawResults)) {
      return null;
    }

    const normalized = rawResults
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const title =
          "title" in item && typeof item.title === "string"
            ? item.title.trim()
            : "";
        const url =
          "url" in item && typeof item.url === "string" ? item.url : "";
        const description =
          "description" in item && typeof item.description === "string"
            ? item.description
            : "";

        if (!title && !url) {
          return null;
        }

        return {
          title: title || url,
          url,
          description,
        };
      })
      .filter((item): item is BraveSearchResult => Boolean(item?.url));

    return normalized;
  } catch (error) {
    console.warn("[ResearchBlock] Failed to parse brave_search result", error);
    return null;
  }
};

type ResearchBlockProps = {
  items: ResearchItemData[];
  blockIndex: number;
  messageIndex: number;
  isActive?: boolean;
};

type ResearchBlockItemProps = {
  item: ResearchItemData;
  itemKey: string;
  messageIndex: number;
  blockIndex: number;
  itemIndex: number;
  items: ResearchItemData[];
};

const ResearchBlockItem = memo(function ResearchBlockItem({
  item,
  itemKey,
  messageIndex,
  blockIndex,
  itemIndex,
  items,
}: ResearchBlockItemProps) {
  const contentId = `research-item-${itemKey}`;
  const isExpanded = useChatStore((state) => {
    const message = state.messages[messageIndex];
    const block = message?.blocks[blockIndex];
    if (!block || block.type !== "research") {
      return false;
    }
    const researchItem = block.items[itemIndex];
    return researchItem?.isExpanded ?? false;
  });

  // Handle fetch_url tool visualization
  if (item.kind === "tool_call" && item.tool === "fetch_url") {
    const nextItem = items[itemIndex + 1];
    const resultItem =
      nextItem?.kind === "tool_result" && nextItem.tool === "fetch_url"
        ? nextItem
        : null;

    const url = typeof item.args.url === "string" ? item.args.url : "Unknown URL";

    return (
      <div className="animate-enter-down px-4">
        <FetchTerminal
          url={url}
          status={resultItem ? (resultItem.result.startsWith("Error") ? "error" : "complete") : "pending"}
          result={resultItem?.result}
          isExpanded={isExpanded}
          onToggle={() =>
            useChatStore
              .getState()
              .toggleResearchItem(messageIndex, blockIndex, itemIndex)
          }
        />
      </div>
    );
  }

  // Hide fetch_url result as it's handled by the call item
  if (item.kind === "tool_result" && item.tool === "fetch_url") {
    const prevItem = items[itemIndex - 1];
    if (prevItem?.kind === "tool_call" && prevItem.tool === "fetch_url") {
      return null;
    }
  }

  // Handle brave_search tool visualization
  if (item.kind === "tool_call" && item.tool === "brave_search") {
    const nextItem = items[itemIndex + 1];
    const resultItem =
      nextItem?.kind === "tool_result" && nextItem.tool === "brave_search"
        ? nextItem
        : null;

    const query =
      typeof item.args.query === "string" ? item.args.query : "Unknown query";
    const braveResults = resultItem
      ? parseBraveSearchResults(resultItem.result)
      : null;

    return (
      <div className="animate-enter-down px-4 py-2">
        {/* Searching State */}
        {!resultItem && (
          <div className="flex items-center gap-3 rounded-lg border border-(--border-subtle) bg-(--surface-muted) p-3 text-sm text-(--text-secondary)">
            <div className="relative flex h-4 w-4 items-center justify-center">
               <div className="absolute inset-0 animate-ping rounded-full bg-(--text-tertiary) opacity-20" />
               <Search className="relative h-3.5 w-3.5 animate-pulse text-foreground" />
            </div>
            <span className="font-mono text-xs text-(--text-tertiary)">SEARCHING_QUERY: <span className="font-bold text-foreground">{query}</span></span>
          </div>
        )}

        {/* Results State */}
        {braveResults ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-medium text-(--text-tertiary)">
              <Zap className="h-3.5 w-3.5 text-foreground" />
              <span className="font-mono uppercase tracking-wider">Search Results: {query}</span>
            </div>
            {braveResults.length > 0 ? (
              <div className="overflow-x-auto bg-(--surface-muted) rounded-xl border border-(--border-subtle) p-3 relative group/scroll">
                 {/* Scroll indicators */}
                 <div className="absolute left-0 top-0 bottom-0 w-4 bg-linear-to-r from-(--surface-muted) to-transparent z-10 pointer-events-none" />
                 <div className="absolute right-0 top-0 bottom-0 w-4 bg-linear-to-l from-(--surface-muted) to-transparent z-10 pointer-events-none" />
                 
                <div className="flex gap-3 w-max pb-2">
                  {braveResults.map((result, index) => (
                    <SearchResultCard
                      key={`${result.url}-${index}`}
                      title={result.title}
                      url={result.url}
                      description={result.description}
                      delay={index * 90}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-(--border-subtle) bg-(--surface-muted) p-4 text-center text-xs font-mono text-(--text-tertiary)">
                &gt; SYSTEM: NO_RESULTS_FOUND
              </div>
            )}
          </div>
        ) : resultItem ? (
          <div className="overflow-x-auto bg-(--surface-muted) p-4 text-xs rounded-lg border border-(--border-subtle) font-mono text-(--text-secondary)">
            <Markdown content={resultItem.result} />
          </div>
        ) : null}
      </div>
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
        onClick={() =>
          useChatStore
            .getState()
            .toggleResearchItem(messageIndex, blockIndex, itemIndex)
        }
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
  const isExpanded = useChatStore((state) => {
    const message = state.messages[messageIndex];
    const block = message?.blocks[blockIndex];
    if (!block || block.type !== "research") {
      return false;
    }
    return block.isExpanded;
  });

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
        onClick={() =>
          useChatStore.getState().toggleResearchBlock(messageIndex, blockIndex)
        }
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
                messageIndex={messageIndex}
                blockIndex={blockIndex}
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
