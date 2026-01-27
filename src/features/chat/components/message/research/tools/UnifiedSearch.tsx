"use client";

import { useState } from "react";
import type { Tool } from "@/src/features/chat/types/chat";
import Markdown from "@/src/shared/components/Markdown";
import { Search, Zap, Globe, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getToolLifecycle } from "../utils";

// ==============================================================================
// Types & Utilities
// ==============================================================================

type UnifiedSearchResult = {
  title: string;
  url: string;
  description: string;
};

const parseUnifiedSearchResults = (
  rawResult: string
): UnifiedSearchResult[] | null => {
  try {
    const data = JSON.parse(rawResult);
    const rawResults =
      (Array.isArray(data?.results) && data.results) ||
      (Array.isArray(data?.rawResults) && data.rawResults) ||
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
          "url" in item && typeof item.url === "string"
            ? item.url
            : "link" in item && typeof item.link === "string"
              ? item.link
              : "";
        const description =
          "description" in item && typeof item.description === "string"
            ? item.description
            : "snippet" in item && typeof item.snippet === "string"
              ? item.snippet
              : "content" in item && typeof item.content === "string"
                ? item.content
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
      .filter((item): item is UnifiedSearchResult => Boolean(item?.url));

    return normalized;
  } catch (error) {
    console.warn("[UnifiedSearch] Failed to parse search result", error);
    return null;
  }
};

const getToolLabel = (toolName: string) => {
  if (toolName === "brave_search") return "Brave";
  if (toolName === "serp_search") return "SERP";
  if (toolName === "tavily_search") return "Tavily";
  return null;
};

const ERROR_PREFIXES = [
  "Error:",
  "Error executing",
  "Brave Search API error:",
  "Brave Search error:",
  "SerpAPI error:",
  "Tavily API error:",
  "Tavily Search error:",
];

function tryGetHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "UNKNOWN";
  }
}

// ==============================================================================
// SearchResultCard Component (Internal)
// ==============================================================================

type SearchResultCardProps = {
  title: string;
  url: string;
  delay?: number;
};

function SearchResultCard({ title, url, delay = 0 }: SearchResultCardProps) {
  const hostname = tryGetHostname(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "group relative flex w-full flex-col gap-1.5 rounded-md p-2",
        "bg-card border border-transparent hover:border-(--border-subtle) hover:bg-(--surface-hover) transition-all duration-200"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-1.5">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-(--surface-hover)">
          <Globe className="h-4 w-4 text-(--text-secondary)" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-[10px] font-medium text-(--text-tertiary) uppercase truncate">
            {hostname}
          </div>
          <div
            className="text-xs font-semibold leading-tight text-foreground"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        </div>
      </div>
    </a>
  );
}

// ==============================================================================
// UnifiedSearch Component (Main Export)
// ==============================================================================

type UnifiedSearchProps = {
  tool: Tool;
};

export function UnifiedSearch({ tool }: UnifiedSearchProps) {
  const { result } = getToolLifecycle(tool);
  const toolName = tool.call.tool;
  const toolLabel = getToolLabel(toolName);
  const query =
    typeof tool.call.args.query === "string"
      ? tool.call.args.query
      : "Unknown query";
  const searchResults = result ? parseUnifiedSearchResults(result.result) : null;
  const [isExpanded, setIsExpanded] = useState(true);

  const resultText = typeof result?.result === "string" ? result.result : "";
  const isError = ERROR_PREFIXES.some((prefix) => resultText.startsWith(prefix));

  return (
    <div className="px-3 py-1">
      {!result && (
        <div className="flex items-center gap-2 text-xs font-medium text-(--text-tertiary)">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-(--text-tertiary) opacity-20" />
            <Search className="relative h-3 w-3 animate-pulse text-foreground" />
          </div>
          <span>
            Searching for: <span className="text-(--text-secondary)">{query}</span>
          </span>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-(--text-tertiary) group-hover:text-(--text-secondary) transition-colors">
              <Zap className="h-3 w-3 text-foreground" />
              <span>Search Results: {query}</span>
              {toolLabel ? (
                <span className="rounded-full bg-(--surface-hover) px-2 py-0.5 text-[10px] font-semibold text-(--text-tertiary)">
                  {toolLabel}
                </span>
              ) : null}
            </div>
            <ChevronRight
              className={cn(
                "h-3 w-3 text-muted-foreground transition-all duration-200 group-hover:text-(--text-secondary)",
                isExpanded && "rotate-90"
              )}
            />
          </button>

          {isExpanded && (
            <>
              {searchResults && searchResults.length > 0 ? (
                <div className="relative group/scroll">
                  <div className="p-2">
                    <div className="flex flex-col gap-2 w-full max-h-[340px] overflow-y-auto">
                      {searchResults.map((resultItem, index) => (
                        <SearchResultCard
                          key={`${resultItem.url}-${index}`}
                          title={resultItem.title}
                          url={resultItem.url}
                          delay={index * 90}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : searchResults && searchResults.length === 0 ? (
                <div className="px-3 py-1 text-center text-xs text-(--text-tertiary)">
                  No results found
                </div>
              ) : isError ? (
                <div className="px-3 py-1 text-xs text-destructive">
                  <Markdown content={resultText} />
                </div>
              ) : (
                <div className="overflow-x-auto px-3 py-1 text-xs text-(--text-secondary)">
                  <Markdown content={resultText} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
