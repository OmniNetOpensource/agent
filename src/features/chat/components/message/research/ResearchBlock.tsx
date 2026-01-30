"use client";

import { memo } from "react";
import type { ResearchItem as ResearchItemData } from "@/src/features/chat/types/chat";
import {
  FetchUrlCard,
  RenderHtmlCard,
  SearchCard,
  ThinkingCard,
  UnknownToolCard,
} from "./cards";

type ResearchBlockProps = {
  items: ResearchItemData[];
  blockIndex: number;
  messageIndex: number;
  isActive?: boolean;
};

type ResearchBlockItemProps = {
  item: ResearchItemData;
  isActive?: boolean;
};

const ResearchBlockItem = memo(function ResearchBlockItem({
  item,
  isActive,
}: ResearchBlockItemProps) {
  if (item.kind === "thinking") {
    return (
      <ThinkingCard
        item={item}
        isActive={Boolean(isActive)}
      />
    );
  }

  if (item.kind === "tool") {
    const toolName = item.data.call.tool;

    switch (toolName) {
      case "fetch_url":
        return (
          <FetchUrlCard
            item={item}
            isActive={Boolean(isActive)}
          />
        );
      case "tavily_search":
        return (
          <SearchCard
            item={item}
            isActive={Boolean(isActive)}
          />
        );
      case "render_html":
        return (
          <RenderHtmlCard
            item={item}
            isActive={Boolean(isActive)}
          />
        );
      default:
        return (
          <UnknownToolCard
            item={item}
            isActive={Boolean(isActive)}
          />
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
  return (
    <div className="my-2 space-y-2">
      {items.map((item, itemIndex) => {
        const itemKey = `${messageIndex}-${blockIndex}-${itemIndex}`;

        return (
          <ResearchBlockItem
            key={itemKey}
            item={item}
            isActive={isActive}
          />
        );
      })}
    </div>
  );
});
