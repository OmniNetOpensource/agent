import type { Tool, ToolProgress, ToolResult } from "@/src/features/chat/types/chat";

export function getToolLifecycle(tool: Tool): {
  progress: ToolProgress[];
  result?: ToolResult;
} {
  return {
    progress: tool.progress ?? [],
    result: tool.result,
  };
}
