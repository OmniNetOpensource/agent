import { type ReactNode } from "react";
import Markdown from "@/components/Markdown";
import { cx } from "@/utils/cx";
import { prettyPrintArgs } from "@/utils/chatFormat";
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

  let title = "Thinking";
  let containerClasses =
    "bg-(--surface-overlay) px-4 py-3 text-sm text-(--text-secondary)";
  let contentBody: ReactNode = null;

  if (item.kind === "thinking") {
    title = "Thinking";
    containerClasses =
      "bg-(--surface-overlay) px-4 py-3 text-sm text-(--text-secondary)";
    contentBody = <Markdown content={item.text} />;
  } else if (item.kind === "tool_call") {
    title = `Tool Call · ${item.tool}`;
    containerClasses =
      "border border-dashed border-(--border-subtle) bg-(--surface-overlay) px-4 py-3 text-xs text-(--text-secondary)";
    contentBody = (
      <pre className="mt-2 overflow-x-auto font-mono text-[0.75rem] text-(--text-secondary)">
        {prettyPrintArgs(item.args)}
      </pre>
    );
  } else if (item.kind === "tool_result") {
    title = `Tool Result · ${item.tool}`;
    containerClasses =
      "border border-(--border-subtle) bg-(--surface-card) px-4 py-3 text-xs text-foreground";

    contentBody = (
      <pre className="mt-2 whitespace-pre-wrap font-mono text-[0.75rem] text-foreground">
        {item.result}
      </pre>
    );
  }

  return (
    <div className={cx("space-y-3", containerClasses)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 border border-transparent bg-(--surface-muted) px-3 py-2 text-xs font-semibold text-(--text-secondary) transition-colors hover:border-(--border-hover)"
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span
          aria-hidden="true"
          className={cx(
            "text-sm transition-transform",
            isExpanded && "rotate-90"
          )}
        >
          ▶
        </span>
        <span className="flex-1 text-left">{title}</span>
      </button>

      <div
        id={contentId}
        className={cx(
          "text-left max-h-[240px] overflow-y-auto overscroll-contain",
          !isExpanded && "hidden"
        )}
      >
        {isExpanded && contentBody}
      </div>
    </div>
  );
}
