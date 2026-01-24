import { callToolByName } from "@/src/shared/lib/tools";
import type { ToolProgressUpdate } from "@/src/shared/lib/tools/types";
import type { ConversationLogger } from "@/src/shared/lib/conversation-logger";
import type { PendingToolCall, ToolCallResult, StreamEvent } from "./types";

export type ToolExecutorOptions = {
  logger: ConversationLogger | null;
  onEvent: (event: StreamEvent) => void;
};

export class ToolExecutor {
  private logger: ConversationLogger | null;
  private onEvent: (event: StreamEvent) => void;

  constructor(options: ToolExecutorOptions) {
    this.logger = options.logger;
    this.onEvent = options.onEvent;
  }

  async execute(toolCalls: PendingToolCall[]): Promise<ToolCallResult[]> {
    return Promise.all(
      toolCalls.map(async (tc) => {
        this.logger?.log("TOOLS", `Calling tool: ${tc.name}`, { toolName: tc.name, args: tc.args });
        this.onEvent({ type: "tool_call", tool: tc.name, args: tc.args, callId: tc.id });

        const result = await callToolByName(tc.name, tc.args, (progress: ToolProgressUpdate) => {
          this.logger?.log("TOOLS", `Tool progress: ${tc.name}`, {
            toolName: tc.name,
            stage: progress.stage,
            message: progress.message,
            receivedBytes: progress.receivedBytes,
            totalBytes: progress.totalBytes,
          });
          this.onEvent({
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

        this.logger?.log("TOOLS", `Tool completed: ${tc.name}`, {
          toolName: tc.name,
          resultLength: normalizedResult.length,
          resultPreview: normalizedResult.substring(0, 200),
        });

        this.onEvent({ type: "tool_result", tool: tc.name, result, callId: tc.id });

        return { id: tc.id, name: tc.name, result: normalizedResult };
      })
    );
  }
}
