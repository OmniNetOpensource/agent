import type { ResearchItem } from "@/src/features/chat/types/chat";
import Markdown from "@/src/shared/components/Markdown";
import { Search, Zap, ExternalLink, Globe, Lock } from "lucide-react";
import { cx } from "@/src/shared/utils/cx";

// ============================================================================
// Types & Utilities
// ============================================================================

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

// ============================================================================
// SearchResultCard Component (Internal)
// ============================================================================

type SearchResultCardProps = {
  title: string;
  url: string;
  description?: string;
  delay?: number;
};

function SearchResultCard({
  title,
  url,
  description,
  delay = 0,
}: SearchResultCardProps) {
  const hostname = tryGetHostname(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={cx(
        "group relative flex w-[280px] shrink-0 flex-col gap-3 rounded-xl p-4 transition-all duration-500 ease-out",
        "bg-(--surface-card) border border-(--border-subtle)",
        "hover:-translate-y-2 hover:shadow-float hover:border-(--border-hover)",
        "animate-enter-down"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Tech Decoration Lines - Minimalist */}
      <div className="absolute -left-px top-6 h-6 w-[2px] bg-foreground opacity-0 transition-all duration-300 group-hover:opacity-100" />
      <div className="absolute -right-px bottom-6 h-6 w-[2px] bg-foreground opacity-0 transition-all duration-300 group-hover:opacity-100" />

      {/* Header */}
      <div className="relative z-10 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--surface-hover) text-foreground transition-all duration-300 group-hover:scale-105">
          <Globe className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)">
            <Lock className="h-2.5 w-2.5" />
            <span className="truncate uppercase">{hostname}</span>
          </div>
          <div
            className="text-sm font-bold leading-tight text-foreground transition-colors"
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
      <div className="relative z-10 min-h-[40px]">
        {description ? (
          <p
            className="text-xs leading-relaxed text-(--text-secondary) font-medium"
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
          <p className="text-xs italic text-(--text-tertiary)">No metadata available</p>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-(--border-subtle) pt-3 mt-auto">
        <span className="truncate text-[10px] font-mono font-medium text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)">
          SOURCE_LINK_V1
        </span>
        <div className="flex items-center gap-1 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 text-(--color-brand)">
           <span className="text-[10px] font-bold">VISIT</span>
           <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
}

// ============================================================================
// BraveSearch Component (Main Export)
// ============================================================================

type BraveSearchProps = {
  item: Extract<ResearchItem, { kind: "tool_call" }>;
  items: ResearchItem[];
  itemIndex: number;
};

export function BraveSearch({
  item,
  items,
  itemIndex,
}: BraveSearchProps) {
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
          <span className="font-mono text-xs text-(--text-tertiary)">
            SEARCHING_QUERY:{" "}
            <span className="font-bold text-foreground">{query}</span>
          </span>
        </div>
      )}

      {/* Results State */}
      {braveResults ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-xs font-medium text-(--text-tertiary)">
            <Zap className="h-3.5 w-3.5 text-foreground" />
            <span className="font-mono uppercase tracking-wider">
              Search Results: {query}
            </span>
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
