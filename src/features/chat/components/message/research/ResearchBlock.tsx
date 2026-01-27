"use client";

import { memo, useState } from "react";
import type { ResearchItem as ResearchItemData } from "@/src/features/chat/types/chat";
import { FetchUrl } from "./tools/FetchUrl";
import { UnifiedSearch } from "./tools/UnifiedSearch";
import { RenderHtml } from "./tools/RenderHtml";
import { ThinkingItem } from "./tools/ThinkingItem";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type ResearchBlockProps = {
  items: ResearchItemData[];
  blockIndex: number;
  messageIndex: number;
  isActive?: boolean;
};

type ResearchBlockItemProps = {
  item: ResearchItemData;
  itemKey: string;
};

const ResearchBlockItem = memo(function ResearchBlockItem({
  item,
  itemKey,
}: ResearchBlockItemProps) {
  // Handle thinking
  if (item.kind === "thinking") {
    return <ThinkingItem item={item} itemKey={itemKey} />;
  }

  // Handle tool calls - each tool component handles its own result/progress
  if (item.kind === "tool") {
    const toolName = item.data.call.tool;

    switch (toolName) {
      case "fetch_url":
        return <FetchUrl tool={item.data} />;
      case "brave_search":
      case "serp_search":
      case "tavily_search":
        return <UnifiedSearch tool={item.data} />;
      case "render_html":
        return <RenderHtml tool={item.data} />;
      default:
        if (process.env.NODE_ENV === "development") {
          console.error(
            `[ResearchBlock] No UI component registered for tool: ${toolName}`
          );
        }
        return (
          <div className="px-3 py-1 text-xs font-mono text-destructive/80">
            Missing UI for tool: <strong>{toolName}</strong>
          </div>
        );
    }
  }

  return null;
});

const getLatestStatus = (items: ResearchItemData[]): string => {
  if (items.length === 0) return "Researching...";

  const lastItem = items[items.length - 1];

  if (lastItem.kind === "thinking") {
    return "Thinking...";
  }

  if (lastItem.kind === "tool") {
    const toolName = lastItem.data.call.tool;
    const args = lastItem.data.call.args;

    if (
      toolName === "brave_search" ||
      toolName === "serp_search" ||
      toolName === "tavily_search"
    ) {
      const query = args.query as string;
      return `Searching "${query}"`;
    }

    if (toolName === "fetch_url") {
      const url = args.url as string;
      try {
        const hostname = new URL(url).hostname;
        return `Fetching ${hostname}`;
      } catch {
        return `Fetching URL`;
      }
    }

    if (toolName === "render_html") {
      const title = args.title as string | undefined;
      return title ? `Creating "${title}"` : "Creating preview";
    }

    return `Running ${toolName}`;
  }

  return "Researching...";
};

const ShimmerText = ({ children }: { children: string }) => {
  return (
    <>
      <style>
        {`
          @keyframes research-shimmer {
            0% { background-position: 200% 50%; }
            100% { background-position: -200% 50%; }
          }
        `}
      </style>
      <span
        style={{
          display: "inline-block",
          fontSize: "14px",
          fontWeight: 500,
          color: "transparent",
          backgroundImage: `linear-gradient(90deg,
            var(--text-tertiary) 0%,
            var(--text-tertiary) 35%,
            var(--text-primary) 50%,
            var(--text-tertiary) 65%,
            var(--text-tertiary) 100%)`,
          backgroundSize: "400% 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "research-shimmer 4s linear infinite",
        }}
      >
        {children}
      </span>
    </>
  );
};

export const ResearchBlock = memo(function ResearchBlock({
  items,
  blockIndex,
  messageIndex,
  isActive,
}: ResearchBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className="my-2"
    >
      <CollapsibleTrigger
        className="w-full px-1.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30"
      >
        {isActive ? (
          <ShimmerText>{getLatestStatus(items)}</ShimmerText>
        ) : (
          <span className="text-sm font-medium text-(--text-tertiary) transition-colors hover:text-(--text-secondary)">
            Research Completed
          </span>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="max-h-[500px] overflow-y-auto overscroll-contain bg-transparent">
          {items.map((item, itemIndex) => {
            const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;
            return (
              <ResearchBlockItem key={itemKey} item={item} itemKey={itemKey} />
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
