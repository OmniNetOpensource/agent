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
    <div className="group/thinking">
      <button
        type="button"
        onClick={toggleItem}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-1 text-xs transition-colors bg-transparent"
        )}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className="flex items-center justify-center text-foreground group-hover/thinking:text-foreground transition-colors">
          <Brain className="h-3.5 w-3.5" />
        </div>

        <span className="flex-1 text-left font-medium text-(--text-tertiary) group-hover/thinking:text-(--text-secondary) transition-colors">
          Thinking Process
        </span>

        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-all duration-200 group-hover/thinking:text-(--text-secondary)",
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
        <div className="overflow-x-auto px-3 py-1 text-xs text-(--text-secondary)">
          <Markdown content={item.text} />
        </div>
      </div>
    </div>
  );
});
