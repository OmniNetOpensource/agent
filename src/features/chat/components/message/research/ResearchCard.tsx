"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ResearchCardProps = {
  title: string;
  icon: ReactNode;
  description?: ReactNode;
  expandable?: boolean;
  isLatest?: boolean;
  isActive?: boolean;
  syncKey?: number;
  children: ReactNode;
};

export function ResearchCard({
  title,
  icon,
  description,
  expandable = true,
  isLatest = false,
  isActive = false,
  syncKey,
  children,
}: ResearchCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    Boolean(isLatest) && expandable
  );
  const contentId = useId();
  const showActive = isActive && isLatest;

  useEffect(() => {
    if (!expandable) {
      setIsExpanded(false);
      return;
    }
    if (!isActive) return;
    setIsExpanded(Boolean(isLatest));
  }, [isActive, isLatest, syncKey, expandable]);

  return (
    <div
      className={cn(
        "group/research-card rounded-lg border border-(--border-primary) bg-(--surface-secondary) p-3 transition-all duration-300 ease-in-out",
        "hover:bg-(--surface-hover)",
        showActive &&
          "relative border-l-4 border-l-(--interactive-primary) before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-(--interactive-primary) before:opacity-60 before:animate-pulse"
      )}
    >
      <button
        type="button"
        onClick={
          expandable ? () => setIsExpanded((prev) => !prev) : undefined
        }
        className={cn(
          "flex w-full min-h-[36px] items-center gap-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--interactive-primary)/30",
          !expandable && "cursor-default"
        )}
        aria-expanded={expandable ? isExpanded : undefined}
        aria-controls={expandable ? contentId : undefined}
        aria-disabled={!expandable}
      >
        <span className="flex h-4 w-4 items-center justify-center text-foreground">
          {icon}
        </span>
        <span className="flex-1">
          <span className="block font-medium text-(--text-tertiary) transition-colors group-hover/research-card:text-(--text-secondary)">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 flex items-center gap-1 text-[10px] text-(--text-tertiary)">
              {description}
            </span>
          ) : null}
        </span>
        {expandable ? (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-all duration-200 group-hover/research-card:text-(--text-secondary)",
              isExpanded && "rotate-90"
            )}
          />
        ) : null}
      </button>

      {expandable ? (
        <div
          id={contentId}
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded
              ? "mt-2 max-h-[420px] opacity-100"
              : "max-h-0 opacity-0"
          )}
        >
          <div className="max-h-[420px] overflow-y-auto pr-1 text-xs text-(--text-secondary)">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
