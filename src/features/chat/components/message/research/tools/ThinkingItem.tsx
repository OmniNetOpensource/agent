"use client";

import { memo } from "react";
import Markdown from "@/src/shared/components/Markdown";
import type { ResearchItem } from "@/src/features/chat/types/chat";

type ThinkingItemProps = {
  item: Extract<ResearchItem, { kind: "thinking" }>;
};

export const ThinkingItem = memo(function ThinkingItem({
  item,
}: ThinkingItemProps) {
  return (
    <div className="overflow-x-auto text-xs text-(--text-secondary)">
      <Markdown content={item.text} />
    </div>
  );
});
