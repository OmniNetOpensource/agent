"use client";

import type { Tool } from "@/src/features/chat/types/chat";
import Markdown from "@/src/shared/components/Markdown";
import {
  Search,
  Zap,
  ExternalLink,
  Globe,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getToolLifecycle } from "../utils";
import { useState } from "react";

// ==============================================================================
// Types & Utilities
// ==============================================================================

type BraveSearchResult = {
  title: string;
  url: string;
  description: string;
  thumbnailSrc?: string;
};

const parseBraveSearchResults = (
  rawResult: string
): BraveSearchResult[] | null => {
  try {
    const data = JSON.parse(rawResult);
    const rawResults =
      (Array.isArray(data?.rawResults) && data.rawResults) ||
      (Array.isArray(data?.results) && data.results) ||
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
        const thumbnailSrc = (() => {
          if (!("thumbnail" in item)) return undefined;
          const thumbnail = item.thumbnail as
            | { src?: unknown; original?: unknown }
            | string
            | undefined;
          if (typeof thumbnail === "string") {
            return thumbnail;
          }
          if (thumbnail && typeof thumbnail === "object") {
            if (typeof thumbnail.src === "string") return thumbnail.src;
            if (typeof thumbnail.original === "string") return thumbnail.original;
          }
          return undefined;
        })();

        if (!title && !url) {
          return null;
        }

        return {
          title: title || url,
          url,
          description,
          thumbnailSrc,
        };
      })
      .filter((item): item is BraveSearchResult => Boolean(item?.url));

    return normalized;
  } catch (error) {
    console.warn("[BraveSearch] Failed to parse brave_search result", error);
    return null;
  }
};

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
  description?: string;
  thumbnailSrc?: string;
  delay?: number;
};

function SearchResultCard({
  title,
  url,
  description,
  thumbnailSrc,
  delay = 0,
}: SearchResultCardProps) {
  const hostname = tryGetHostname(url);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(thumbnailSrc) && !imageFailed;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "group relative flex w-60 shrink-0 flex-col gap-2 rounded-lg p-3 transition-all duration-300 ease-out",
        "bg-card",
        "hover:-translate-y-1"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Thumbnail */}
      <div className="relative h-20 w-full overflow-hidden rounded-md bg-(--surface-hover)">
        {showImage ? (
          <img
            src={thumbnailSrc}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-(--surface-hover) via-(--surface-muted) to-(--surface-card)">
            <ImageIcon className="h-4 w-4 text-(--text-tertiary)" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-(--border-subtle)" />
      </div>

      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-(--surface-hover) text-(--text-secondary)">
          <Globe className="h-3 w-3" />
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

      {/* Description */}
      <div className="min-h-[32px]">
        {description ? (
          <p
            className="text-[10px] leading-relaxed text-(--text-secondary)"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>
        ) : (
          <p className="text-[10px] italic text-(--text-tertiary)">
            No description
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end pt-2 mt-auto">
        <div className="flex items-center gap-1 text-(--text-tertiary) group-hover:text-(--color-brand) transition-colors">
          <span className="text-[9px] font-medium">VISIT</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </div>
      </div>
    </a>
  );
}

// ==============================================================================
// BraveSearch Component (Main Export)
// ==============================================================================

type BraveSearchProps = {
  tool: Tool;
};

export function BraveSearch({ tool }: BraveSearchProps) {
  const { result } = getToolLifecycle(tool);
  const query =
    typeof tool.call.args.query === "string"
      ? tool.call.args.query
      : "Unknown query";
  const braveResults = result ? parseBraveSearchResults(result.result) : null;
  const [isExpanded, setIsExpanded] = useState(true);

  // 检测是否是错误信息
  const isError =
    result?.result &&
    (result.result.startsWith("Brave Search API error:") ||
      result.result.startsWith("Brave Search error:") ||
      result.result.startsWith("Error:"));

  return (
    <div className="px-3 py-2">
      {/* Searching State */}
      {!result && (
        <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-(--text-tertiary) opacity-20" />
            <Search className="relative h-3 w-3 animate-pulse text-foreground" />
          </div>
          <span className="font-medium">
            Searching for: <span className="text-foreground">{query}</span>
          </span>
        </div>
      )}

      {/* Results State - 无论成功还是错误都显示标题栏 */}
      {result && (
        <div className="space-y-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-(--text-tertiary) group-hover:text-(--text-secondary) transition-colors">
              <Zap className="h-3 w-3 text-foreground" />
              <span>Search Results: {query}</span>
            </div>
            <ChevronRight
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          </button>

          {isExpanded && (
            <>
              {braveResults && braveResults.length > 0 ? (
                <div className="relative bg-(--surface-muted) rounded-lg group/scroll">
                  {/* Scroll indicators */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-linear-to-r from-(--surface-muted) to-transparent z-[var(--z-card-inner)] pointer-events-none rounded-l-lg" />
                  <div className="absolute right-0 top-0 bottom-0 w-4 bg-linear-to-l from-(--surface-muted) to-transparent z-[var(--z-card-inner)] pointer-events-none rounded-r-lg" />

                  <div className="overflow-x-auto p-2">
                    <div className="flex gap-2 w-max pb-1">
                      {braveResults.map((result, index) => (
                        <SearchResultCard
                          key={`${result.url}-${index}`}
                          title={result.title}
                          url={result.url}
                          description={result.description}
                          thumbnailSrc={result.thumbnailSrc}
                          delay={index * 90}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : braveResults && braveResults.length === 0 ? (
                <div className="rounded-lg bg-(--surface-muted) p-3 text-center text-xs text-(--text-tertiary)">
                  No results found
                </div>
              ) : isError ? (
                <div className="rounded-lg bg-(--surface-muted) p-3 text-xs text-destructive">
                  <Markdown content={result.result} />
                </div>
              ) : (
                <div className="overflow-x-auto bg-(--surface-muted) p-3 text-xs rounded-lg text-(--text-secondary)">
                  <Markdown content={result.result} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
