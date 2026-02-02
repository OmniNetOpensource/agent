"use client";

import { Check, Loader2, Sparkles, X } from "lucide-react";
import type { ResearchItem } from "@/src/features/chat/types/chat";
import Markdown from "@/src/shared/components/Markdown";
import { BaseResearchCard } from "./BaseResearchCard";
import { getToolLifecycle, parseRenderHtmlResult } from "../utils";

type RenderHtmlCardProps = {
  item: Extract<ResearchItem, { kind: "tool" }>;
  isActive?: boolean;
};

export function RenderHtmlCard({
  item,
  isActive = false,
}: RenderHtmlCardProps) {
  const tool = item.data;
  const { result } = getToolLifecycle(tool);
  const args = tool.call.args as Record<string, unknown>;
  const title = typeof args.title === "string" ? args.title : "preview";
  const resultText = typeof result?.result === "string" ? result.result : "";
  const parsedResult = parseRenderHtmlResult(resultText);
  const isError = parsedResult?.success === false;

  const description = !result ? (
    <>
      <Loader2 className="h-3 w-3 animate-spin text-foreground" />
      <span>Creating preview...</span>
    </>
  ) : isError ? (
    <>
      <X className="h-3 w-3 text-(--status-destructive)" />
      <span>Failed</span>
    </>
  ) : (
    <>
      <Check className="h-3 w-3 text-(--status-success)" />
      <span>Preview ready</span>
    </>
  );

  return (
    <BaseResearchCard
      icon={<Sparkles className="h-3.5 w-3.5" />}
      title={`Creating ${title}`}
      description={description}
      action={null}
      onClick={undefined}
      isActive={isActive}
      buttonProps={{
        "aria-disabled": true,
      }}
    >
      {result ? (
        <div className="text-xs text-(--text-secondary)">
          {isError ? (
            <div className="text-destructive">
              <Markdown content={parsedResult?.error || resultText} />
            </div>
          ) : (
            <span>Preview saved. Open the preview panel to view it.</span>
          )}
        </div>
      ) : null}
    </BaseResearchCard>
  );
}
