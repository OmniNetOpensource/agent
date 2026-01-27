import { callToolByName } from "@/src/shared/lib/tools";
import type { ToolProgressUpdate } from "@/src/shared/lib/tools/types";
import type { ConversationLogger } from "@/src/shared/lib/conversation-logger";
import type { PendingToolCall, ToolCallResult, StreamEvent } from "./types";

export type ExecuteToolsOptions = {
  logger: ConversationLogger | null;
  onEvent: (event: StreamEvent) => void;
};

export async function executeTools(
  toolCalls: PendingToolCall[],
  options: ExecuteToolsOptions
): Promise<ToolCallResult[]> {
  const { logger, onEvent } = options;

  return Promise.all(
    toolCalls.map(async (tc) => {
      logger?.log("TOOLS", `Calling tool: ${tc.name}`, { toolName: tc.name, args: tc.args });
      onEvent({ type: "tool_call", tool: tc.name, args: tc.args, callId: tc.id });

      const result = await callToolByName(tc.name, tc.args, (progress: ToolProgressUpdate) => {
        logger?.log("TOOLS", `Tool progress: ${tc.name}`, {
          toolName: tc.name,
          stage: progress.stage,
          message: progress.message,
          receivedBytes: progress.receivedBytes,
          totalBytes: progress.totalBytes,
        });
        onEvent({
          type: "tool_progress",
          tool: tc.name,
          stage: progress.stage,
          message: String(progress.message ?? ""),
          receivedBytes: progress.receivedBytes,
          totalBytes: progress.totalBytes,
          callId: tc.id,
        });
      });

      const normalizedResult = typeof result === "string" ? result : JSON.stringify(result);

      logger?.log("TOOLS", `Tool completed: ${tc.name}`, {
        toolName: tc.name,
        resultLength: normalizedResult.length,
        resultPreview: normalizedResult.substring(0, 200),
      });

      onEvent({ type: "tool_result", tool: tc.name, result, callId: tc.id });

      return { id: tc.id, name: tc.name, result: normalizedResult };
    })
  );
}
