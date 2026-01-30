"use client";

import { useId, useState } from "react";
import { Check, ChevronRight, Link, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResearchItem } from "@/src/features/chat/types/chat";
import Markdown from "@/src/shared/components/Markdown";
import { BaseResearchCard } from "./BaseResearchCard";
import { getToolLifecycle, tryGetHostname } from "../utils";

type FetchUrlCardProps = {
  item: Extract<ResearchItem, { kind: "tool" }>;
  isActive: boolean;
};

export function FetchUrlCard({ item, isActive }: FetchUrlCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const tool = item.data;
  const { result } = getToolLifecycle(tool);
  const args = tool.call.args as Record<string, unknown>;
  const url = typeof args.url === "string" ? args.url : "";
  const hostname = url ? tryGetHostname(url) : "URL";
  const resultText = typeof result?.result === "string" ? result.result : "";
  const isError = resultText.startsWith("Error");
  const showActive = isActive;

  const description = !result ? (
    <>
      <Loader2 className="h-3 w-3 animate-spin text-foreground" />
      <span>Loading...</span>
    </>
  ) : isError ? (
    <>
      <X className="h-3 w-3 text-(--status-destructive)" />
      <span>Failed</span>
    </>
  ) : (
    <>
      <Check className="h-3 w-3 text-(--status-success)" />
      <span>Success</span>
    </>
  );

  return (
    <BaseResearchCard
      icon={<Link className="h-3.5 w-3.5" />}
      title={`Fetching ${hostname}`}
      description={description}
      action={
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-all duration-200 group-hover/research-card:text-(--text-secondary)",
            isExpanded && "rotate-90"
          )}
        />
      }
      isActive={showActive}
      onClick={() => setIsExpanded((prev) => !prev)}
      buttonProps={{
        "aria-expanded": isExpanded,
        "aria-controls": contentId,
      }}
    >
      <div
        id={contentId}
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded
            ? "mt-2 max-h-[420px] opacity-100"
            : "max-h-0 opacity-0"
        )}
      >
        <div className="max-h-[420px] overflow-y-auto overflow-x-auto pr-1 text-xs text-(--text-secondary)">
          {!result ? null : isError ? (
            <div className="text-xs text-destructive">
              <Markdown content={resultText} />
            </div>
          ) : (
            <Markdown content={resultText} />
          )}
        </div>
      </div>
    </BaseResearchCard>
  );
}
