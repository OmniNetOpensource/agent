"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type BranchNavigatorProps = {
  currentIndex: number;
  total: number;
  onNavigate: (direction: "prev" | "next") => void;
  disabled?: boolean;
};

export function BranchNavigator({
  currentIndex,
  total,
  onNavigate,
  disabled = false,
}: BranchNavigatorProps) {
  if (total <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        aria-label="上一条分支"
        disabled={disabled || currentIndex === 0}
        onClick={() => onNavigate("prev")}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span className="min-w-[36px] text-center">
        {currentIndex + 1}/{total}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        aria-label="下一条分支"
        disabled={disabled || currentIndex === total - 1}
        onClick={() => onNavigate("next")}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
