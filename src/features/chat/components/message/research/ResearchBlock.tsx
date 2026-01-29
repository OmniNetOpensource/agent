"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import {
  AlertTriangle,
  Brain,
  Check,
  Link,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type {
  ResearchItem as ResearchItemData,
  Tool,
} from "@/src/features/chat/types/chat";
import { FetchUrl } from "./tools/FetchUrl";
import { UnifiedSearch } from "./tools/UnifiedSearch";
import { RenderHtml } from "./tools/RenderHtml";
import { ThinkingItem } from "./tools/ThinkingItem";
import { ResearchCard } from "./ResearchCard";
import { getToolLifecycle } from "./utils";

type ResearchBlockProps = {
  items: ResearchItemData[];
  blockIndex: number;
  messageIndex: number;
  isActive?: boolean;
};

type ResearchBlockItemProps = {
  item: ResearchItemData;
  isLatest: boolean;
  isActive?: boolean;
  syncKey: number;
};

const SEARCH_TOOL_NAMES = new Set([
  "brave_search",
  "serp_search",
  "tavily_search",
]);

const NON_EXPANDABLE_TOOLS = new Set(["fetch_url", "render_html"]);

const SEARCH_ERROR_PREFIXES = [
  "Error:",
  "Error executing",
  "Brave Search API error:",
  "Brave Search error:",
  "SerpAPI error:",
  "Tavily API error:",
  "Tavily Search error:",
];

type RenderHtmlResult = {
  success: boolean;
  error?: string;
};

const parseRenderHtmlResult = (
  resultStr: string | undefined
): RenderHtmlResult | null => {
  if (!resultStr) return null;
  try {
    const parsed = JSON.parse(resultStr) as RenderHtmlResult;
    if (typeof parsed?.success !== "boolean") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const getSearchResultCount = (rawResult: string): number | null => {
  try {
    const data = JSON.parse(rawResult) as {
      results?: unknown;
      rawResults?: unknown;
      web?: { results?: unknown };
    };
    const rawResults =
      (Array.isArray(data?.results) && data.results) ||
      (Array.isArray(data?.rawResults) && data.rawResults) ||
      (Array.isArray(data?.web?.results) && data.web.results) ||
      [];

    if (!Array.isArray(rawResults)) {
      return null;
    }

    return rawResults.filter((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const url =
        "url" in item && typeof item.url === "string"
          ? item.url
          : "link" in item && typeof item.link === "string"
            ? item.link
            : "";
      return Boolean(url);
    }).length;
  } catch {
    return null;
  }
};

const getToolDescription = (
  tool: Tool,
  toolName: string
): ReactNode | null => {
  const { result } = getToolLifecycle(tool);
  const resultText = typeof result?.result === "string" ? result.result : "";

  if (!result) {
    if (toolName === "fetch_url") {
      return (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-foreground" />
          <span>Loading...</span>
        </>
      );
    }

    if (toolName === "render_html") {
      return (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-foreground" />
          <span>Creating preview...</span>
        </>
      );
    }

    if (SEARCH_TOOL_NAMES.has(toolName)) {
      return (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-foreground" />
          <span>Searching...</span>
        </>
      );
    }

    return null;
  }

  if (toolName === "fetch_url") {
    const isError = resultText.startsWith("Error");
    return isError ? (
      <>
        <X className="h-3 w-3 text-(--status-destructive)" />
        <span>Failed</span>
      </>
    ) : (
      <>
        <Check className="h-3 w-3 text-(--status-success)" />
        <span>Success</span>
      </>
    );
  }

  if (toolName === "render_html") {
    const parsedResult = parseRenderHtmlResult(resultText);
    const isError = parsedResult?.success === false;
    return isError ? (
      <>
        <X className="h-3 w-3 text-(--status-destructive)" />
        <span>Failed</span>
      </>
    ) : (
      <>
        <Check className="h-3 w-3 text-(--status-success)" />
        <span>Preview ready</span>
      </>
    );
  }

  if (SEARCH_TOOL_NAMES.has(toolName)) {
    const isError = SEARCH_ERROR_PREFIXES.some((prefix) =>
      resultText.startsWith(prefix)
    );

    if (isError) {
      return (
        <>
          <X className="h-3 w-3 text-(--status-destructive)" />
          <span>Error</span>
        </>
      );
    }

    const resultCount = getSearchResultCount(resultText);
    if (resultCount === 0) {
      return (
        <>
          <X className="h-3 w-3 text-(--status-destructive)" />
          <span>No results found</span>
        </>
      );
    }

    if (typeof resultCount === "number") {
      return (
        <>
          <Check className="h-3 w-3 text-(--status-success)" />
          <span>
            Found {resultCount} result{resultCount === 1 ? "" : "s"}
          </span>
        </>
      );
    }

    return (
      <>
        <Check className="h-3 w-3 text-(--status-success)" />
        <span>Results ready</span>
      </>
    );
  }

  return null;
};

const isToolExpandable = (toolName: string) =>
  !NON_EXPANDABLE_TOOLS.has(toolName);

const ResearchBlockItem = memo(function ResearchBlockItem({
  item,
  isLatest,
  isActive,
  syncKey,
}: ResearchBlockItemProps) {
  if (item.kind === "thinking") {
    return (
      <ResearchCard
        title="Thinking Process"
        icon={<Brain className="h-3.5 w-3.5" />}
        isLatest={isLatest}
        isActive={isActive}
        syncKey={syncKey}
      >
        <ThinkingItem item={item} />
      </ResearchCard>
    );
  }

  if (item.kind === "tool") {
    const toolName = item.data.call.tool;
    const args = item.data.call.args as Record<string, unknown>;
    const description = getToolDescription(item.data, toolName);
    const expandable = isToolExpandable(toolName);

    switch (toolName) {
      case "fetch_url": {
        const url = typeof args.url === "string" ? args.url : "";
        let hostname = "URL";
        if (url) {
          try {
            hostname = new URL(url).hostname;
          } catch {
            hostname = url;
          }
        }

        return (
          <ResearchCard
            title={`Fetching ${hostname}`}
            icon={<Link className="h-3.5 w-3.5" />}
            description={description}
            expandable={expandable}
            isLatest={isLatest}
            isActive={isActive}
            syncKey={syncKey}
          >
            <FetchUrl tool={item.data} />
          </ResearchCard>
        );
      }
      case "brave_search":
      case "serp_search":
      case "tavily_search":
        return (
          <ResearchCard
            title={
              typeof args.query === "string"
                ? `Search Results: ${args.query}`
                : "Search Results"
            }
            icon={<Search className="h-3.5 w-3.5" />}
            description={description}
            expandable={expandable}
            isLatest={isLatest}
            isActive={isActive}
            syncKey={syncKey}
          >
            <UnifiedSearch tool={item.data} />
          </ResearchCard>
        );
      case "render_html": {
        const title =
          typeof args.title === "string" ? args.title : "preview";

        return (
          <ResearchCard
            title={`Creating ${title}`}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            description={description}
            expandable={expandable}
            isLatest={isLatest}
            isActive={isActive}
            syncKey={syncKey}
          >
            <RenderHtml tool={item.data} />
          </ResearchCard>
        );
      }
      default:
        if (process.env.NODE_ENV === "development") {
          console.error(
            `[ResearchBlock] No UI component registered for tool: ${toolName}`
          );
        }
        return (
          <ResearchCard
            title={`Running ${toolName}`}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            description={description}
            expandable={expandable}
            isLatest={isLatest}
            isActive={isActive}
            syncKey={syncKey}
          >
            <div className="text-xs font-mono text-destructive/80">
              Missing UI for tool: <strong>{toolName}</strong>
            </div>
          </ResearchCard>
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
  const syncKey = items.length;

  return (
    <div className="my-2 space-y-2">
      {items.map((item, itemIndex) => {
        const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;
        const isLatest = itemIndex === items.length - 1;

        return (
          <ResearchBlockItem
            key={itemKey}
            item={item}
            isLatest={isLatest}
            isActive={isActive}
            syncKey={syncKey}
          />
        );
      })}
    </div>
  );
});
