import { memo, useState } from "react";
import { Brain, ChevronRight } from "lucide-react";
import Markdown from "@/src/shared/components/Markdown";
import type { ResearchItem } from "@/src/features/chat/types/chat";
import { cx } from "@/src/shared/utils/cx";

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
    <div className="group border-b border-(--border-subtle) last:border-0 animate-enter-down">
      <button
        type="button"
        onClick={toggleItem}
        className={cx(
          "flex w-full items-center gap-3 px-4 py-3 text-xs transition-colors hover:bg-(--surface-hover)",
          isExpanded ? "bg-(--surface-hover)" : "bg-transparent"
        )}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div
          className={cx(
            "flex items-center justify-center rounded-md p-1 transition-colors border",
            "bg-(--surface-card) text-foreground border-(--border-strong)"
          )}
        >
          <Brain className="h-3.5 w-3.5" />
        </div>

        <span className="flex-1 text-left font-mono font-medium text-(--text-secondary) tracking-tight">
          THOUGHT_PROCESS
        </span>

        <ChevronRight
          className={cx(
            "h-3.5 w-3.5 text-(--text-tertiary) transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
      </button>

      <div
        id={contentId}
        className={cx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="overflow-x-auto bg-(--surface-muted) p-4 text-xs font-mono text-(--text-secondary) border-t border-(--border-subtle)">
          <Markdown content={item.text} />
        </div>
      </div>
    </div>
  );
});
