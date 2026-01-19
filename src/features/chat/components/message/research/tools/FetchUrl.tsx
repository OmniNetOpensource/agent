"use client";

import { Check, Loader2, X } from "lucide-react";
import type { Tool } from "@/src/features/chat/types/chat";
import { getToolLifecycle } from "../utils";

function tryGetHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

type FetchUrlProps = {
  tool: Tool;
};

export function FetchUrl({ tool }: FetchUrlProps) {
  const { result } = getToolLifecycle(tool);
  const url =
    typeof tool.call.args.url === "string" ? tool.call.args.url : "Unknown URL";
  const hostname = tryGetHostname(url);
  const isError = result?.result?.startsWith("Error");

  return (
    <div className="px-3 py-1 group/fetch">
      <div className="flex items-center gap-2 text-xs font-medium text-(--text-tertiary) group-hover/fetch:text-(--text-secondary) transition-colors">
        {!result ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-foreground" />
            <span>
              Fetching <span>{hostname}</span>
            </span>
          </>
        ) : isError ? (
          <>
            <X className="h-3 w-3 text-(--color-destructive)" />
            <span>
              Fetch failed <span>{hostname}</span>
            </span>
          </>
        ) : (
          <>
            <Check className="h-3 w-3 text-(--color-success)" />
            <span>
              Fetch success <span>{hostname}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
