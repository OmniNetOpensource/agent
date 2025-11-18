import Markdown from "@/components/Markdown";
import { cx } from "@/utils/cx";
import type { ResearchItem as ResearchItemData } from "@/types/chat";

type ResearchItemProps = {
  item: ResearchItemData;
  itemKey: string;
  isExpanded: boolean;
  onToggle: () => void;
};

export function ResearchItem({
  item,
  itemKey,
  isExpanded,
  onToggle,
}: ResearchItemProps) {
  const contentId = `research-item-${itemKey}`;

  // Determine header text based on item kind
  const getHeaderText = () => {
    switch (item.kind) {
      case "thinking":
        return "💭 Thinking";
      case "tool_call":
        return `🔧 ${item.tool}`;
      case "tool_result":
        return `📊 ${item.tool} Result`;
    }
  };

  // Determine content to display
  const getContent = () => {
    switch (item.kind) {
      case "thinking":
        return item.text;
      case "tool_call":
        return `\`\`\`json\n${JSON.stringify(item.args, null, 2)}\n\`\`\``;
      case "tool_result":
        return item.result;
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-(--surface-muted) px-3 py-2 text-xs font-semibold text-(--text-secondary) transition-colors hover:bg-(--surface-hover)"
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="flex-1 text-left">{getHeaderText()}</span>
        <span
          aria-hidden="true"
          className={cx(
            "text-sm transition-transform",
            isExpanded && "rotate-90"
          )}
        >
          ▶
        </span>
      </button>

      <div
        id={contentId}
        className={cx(
          "text-left max-h-[240px] overflow-y-auto overscroll-contain bg-(--surface-muted) p-4",
          !isExpanded && "hidden"
        )}
      >
        {isExpanded && <Markdown content={getContent()} />}
      </div>
    </div>
  );
}
