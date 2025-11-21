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
  Sparkles,
  Terminal,
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
    // Fallback if no preceding call found (edge case)
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

  const braveResults =
    item.kind === "tool_result" && item.tool === "brave_search"
      ? parseBraveSearchResults(item.result)
      : null;

  const renderedContent =
    braveResults !== null ? (
      braveResults.length > 0 ? (
        <div className="horizontal-scroll overflow-x-auto bg-(--surface-muted) px-4 py-4">
          <div className="flex gap-3 pb-1 pl-1 pr-4">
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
        <div className="bg-(--surface-muted) p-4 text-xs text-(--text-tertiary)">
          没有找到相关的搜索结果
        </div>
      )
    ) : (
      <div className="overflow-x-auto bg-(--surface-muted) p-4 text-xs">
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
    <div className="my-4 overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-card)/50 shadow-soft backdrop-blur-sm">
      <button
        type="button"
        onClick={() =>
          useChatStore.getState().toggleResearchBlock(messageIndex, blockIndex)
        }
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
          className="max-h-[500px] overflow-y-auto overscroll-contain border-t border-(--border-subtle) bg-(--surface-alt)/30"
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
