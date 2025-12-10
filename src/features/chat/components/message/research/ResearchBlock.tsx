"use client";

import { memo, useState } from "react";
import type { ResearchItem as ResearchItemData } from "@/src/features/chat/types/chat";
import { cn } from "@/lib/utils";
import { FetchUrl } from "./tools/FetchUrl";
import { BraveSearch } from "./tools/BraveSearch";
import { ThinkingItem } from "./tools/ThinkingItem";
import { ChevronRight, Loader2, Cpu } from "lucide-react";
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
          <div className="px-4 py-2 text-xs text-destructive font-mono bg-muted">
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
      className="my-2 overflow-hidden rounded-lg bg-background"
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between px-3 py-2 transition-all hover:bg-accent",
          isActive && "bg-accent"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center text-muted-foreground",
              isActive && "text-primary"
            )}
          >
            {isActive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cpu className="h-4 w-4" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {isActive ? "Researching..." : "Research completed"}
            </span>
            {!isExpanded && items.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({items.length} steps)
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="max-h-[500px] overflow-y-auto overscroll-contain bg-muted/50">
          {items.map((item, itemIndex) => {
            const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;
            return (
              <ResearchBlockItem key={itemKey} item={item} itemKey={itemKey} />
            );
          })}
          {isActive && (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
