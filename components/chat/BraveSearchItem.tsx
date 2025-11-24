import type { ResearchItem } from "@/types/chat";
import { SearchResultCard } from "./SearchResultCard";
import { Search, Zap } from "lucide-react";
import Markdown from "@/components/Markdown";

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
    console.warn("[BraveSearchItem] Failed to parse brave_search result", error);
    return null;
  }
};

type BraveSearchItemProps = {
  item: Extract<ResearchItem, { kind: "tool_call" }>;
  items: ResearchItem[];
  itemIndex: number;
};

export function BraveSearchItem({
  item,
  items,
  itemIndex,
}: BraveSearchItemProps) {
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
