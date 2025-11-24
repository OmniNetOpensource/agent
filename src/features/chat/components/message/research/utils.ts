import type { ResearchItem } from "@/src/features/chat/types/chat";

/**
 * Collects tool_result and tool_progress items that follow a tool_call
 * @param items - All research items
 * @param startIndex - Index of the tool_call item
 * @param toolName - Name of the tool to collect items for
 * @returns Object containing result and progress items
 */
export function collectToolItems(
  items: ResearchItem[],
  startIndex: number,
  toolName: string
) {
  const subsequentItems = items.slice(startIndex + 1);

  // Find where this tool's result appears (if at all)
  const resultIndex = subsequentItems.findIndex(
    (item) => item.kind === "tool_result" && item.tool === toolName
  );

  // Take items up to and including the result, or all if no result yet
  const relevantItems =
    resultIndex >= 0
      ? subsequentItems.slice(0, resultIndex + 1)
      : subsequentItems;

  // Extract result
  const result = relevantItems.find(
    (item): item is Extract<ResearchItem, { kind: "tool_result" }> =>
      item.kind === "tool_result" && item.tool === toolName
  );

  // Extract progress items
  const progress = relevantItems.filter(
    (item): item is Extract<ResearchItem, { kind: "tool_progress" }> =>
      item.kind === "tool_progress" && item.tool === toolName
  );

  return { result, progress };
}
