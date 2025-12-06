"use client";

import { memo, useState } from "react";
import { Brain, ChevronRight } from "lucide-react";
import Markdown from "@/src/shared/components/Markdown";
import type { ResearchItem } from "@/src/features/chat/types/chat";
import { cn } from "@/lib/utils";

type ThinkingItemProps = {
  item: Extract<ResearchItem, { kind: "thinking" }>;
  itemKey: string;
};

export const ThinkingItem = memo(function ThinkingItem({
  item,
  itemKey,
}: ThinkingItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleItem = () => setIsExpanded((prev) => !prev);

  const contentId = `thinking-item-${itemKey}`;

  return (
    <div className="group border-b border-(--border-subtle) last:border-0">
      <button
        type="button"
        onClick={toggleItem}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-accent",
          isExpanded ? "bg-accent" : "bg-transparent"
        )}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className="flex items-center justify-center text-(--text-tertiary)">
          <Brain className="h-3.5 w-3.5" />
        </div>

        <span className="flex-1 text-left font-medium text-(--text-secondary)">
          Thinking Process
        </span>

        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
      </button>

      <div
        id={contentId}
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="overflow-x-auto bg-(--surface-muted) px-3 py-2 text-xs text-(--text-secondary)">
          <Markdown content={item.text} />
        </div>
      </div>
    </div>
  );
});
