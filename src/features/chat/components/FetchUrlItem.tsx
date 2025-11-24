import type { ResearchItem } from "@/src/features/chat/types/chat";
import { FetchTerminal } from "./FetchTerminal";

type FetchUrlItemProps = {
  item: Extract<ResearchItem, { kind: "tool_call" }>;
  items: ResearchItem[];
  itemIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
};

export function FetchUrlItem({
  item,
  items,
  itemIndex,
  isExpanded,
  onToggle,
}: FetchUrlItemProps) {
  // Find subsequent items until we hit the result
  const subsequentItems = items.slice(itemIndex + 1);
  const resultIndex = subsequentItems.findIndex(
    (candidate) =>
      candidate.kind === "tool_result" && candidate.tool === "fetch_url"
  );

  const itemsUntilResult =
    resultIndex >= 0
      ? subsequentItems.slice(0, resultIndex + 1)
      : subsequentItems;

  const resultItem = itemsUntilResult.find(
    (candidate): candidate is Extract<ResearchItem, { kind: "tool_result" }> =>
      candidate.kind === "tool_result" && candidate.tool === "fetch_url"
  );

  const progressItems = itemsUntilResult.filter(
    (candidate): candidate is Extract<ResearchItem, { kind: "tool_progress" }> =>
      candidate.kind === "tool_progress" && candidate.tool === "fetch_url"
  );

  const url = typeof item.args.url === "string" ? item.args.url : "Unknown URL";
  const latestProgress = progressItems[progressItems.length - 1];

  const status: "pending" | "complete" | "error" = resultItem
    ? resultItem.result.startsWith("Error")
      ? "error"
      : "complete"
    : latestProgress?.stage === "error"
    ? "error"
    : "pending";

  return (
    <div className="animate-enter-down px-4">
      <FetchTerminal
        url={url}
        status={status}
        result={resultItem?.result}
        progress={progressItems.map((progress) => ({
          stage: progress.stage,
          message: progress.message,
          receivedBytes: progress.receivedBytes,
          totalBytes: progress.totalBytes,
        }))}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
    </div>
  );
}
