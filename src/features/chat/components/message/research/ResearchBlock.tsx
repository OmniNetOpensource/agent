"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import type { ResearchItem as ResearchItemData } from "@/src/features/chat/types/chat";
import { cn } from "@/lib/utils";
import { FetchUrl } from "./tools/FetchUrl";
import { BraveSearch } from "./tools/BraveSearch";
import { ThinkingItem } from "./tools/ThinkingItem";
import { ChevronRight, Loader2 } from "lucide-react";
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
        return <BraveSearch tool={item.data} />;
      default:
        if (process.env.NODE_ENV === "development") {
          console.error(
            `[ResearchBlock] No UI component registered for tool: ${toolName}`
          );
        }
        return (
          <div className="px-3 py-2 text-xs font-mono text-destructive/80">
            Missing UI for tool: <strong>{toolName}</strong>
          </div>
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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className="my-2"
    >
      <CollapsibleTrigger
        className={cn(
          "relative flex w-full items-center justify-between gap-3 overflow-hidden px-1.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30",
          isActive ? "text-foreground" : "text-(--text-secondary)",
          "hover:text-foreground"
        )}
      >
        {isActive && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-(--surface-hover) to-transparent opacity-70"
            initial={{ x: "0%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1.6, ease: "linear", repeat: Infinity }}
          />
        )}

        <div className="relative z-10 flex items-center gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className={cn(
                "truncate text-sm font-medium tracking-tight"
              )}
            >
              {isActive ? "Researching…" : "Research completed"}
            </span>
            {items.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {items.length} steps
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            "relative z-10 flex h-4 w-4 items-center justify-center text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="max-h-[500px] overflow-y-auto overscroll-contain divide-y divide-border/40 bg-transparent py-1">
          {items.map((item, itemIndex) => {
            const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;
            return (
              <ResearchBlockItem key={itemKey} item={item} itemKey={itemKey} />
            );
          })}
          {isActive && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
