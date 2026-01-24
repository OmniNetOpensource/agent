"use client";

import { Check, Loader2, X } from "lucide-react";
import type { Tool } from "@/src/features/chat/types/chat";
import { getToolLifecycle } from "../utils";

type RenderHtmlProps = {
  tool: Tool;
};

type RenderHtmlResult = {
  success: boolean;
  error?: string;
};

function parseResult(resultStr: string | undefined): RenderHtmlResult | null {
  if (!resultStr) return null;
  try {
    return JSON.parse(resultStr) as RenderHtmlResult;
  } catch {
    return null;
  }
}

export function RenderHtml({ tool }: RenderHtmlProps) {
  const { result } = getToolLifecycle(tool);
  const parsedResult = parseResult(result?.result);
  const title =
    typeof tool.call.args.title === "string"
      ? tool.call.args.title
      : "Untitled Preview";

  const isSuccess = parsedResult?.success === true;
  const isError = parsedResult?.success === false;

  return (
    <div className="px-3 py-1 group/render">
      <div className="flex items-center gap-2 text-xs font-medium text-(--text-tertiary) group-hover/render:text-(--text-secondary) transition-colors">
        {!result ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-foreground" />
            <span>Creating preview...</span>
          </>
        ) : isError ? (
          <>
            <X className="h-3 w-3 text-(--color-destructive)" />
            <span>Failed to create preview</span>
          </>
        ) : isSuccess ? (
          <>
            <Check className="h-3 w-3 text-(--color-success)" />
            <span>
              Preview created: <span>{title}</span>
            </span>
          </>
        ) : (
          <>
            <Check className="h-3 w-3 text-(--color-success)" />
            <span>Preview created</span>
          </>
        )}
      </div>
    </div>
  );
}
