import type { StreamEvent } from "./types";
import type { ConversationLogger } from "@/src/shared/lib/conversation-logger";

const encoder = new TextEncoder();

export type StreamControllerOptions = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  logger: ConversationLogger | null;
};

export class StreamController {
  private controller: ReadableStreamDefaultController<Uint8Array>;
  private logger: ConversationLogger | null;
  private closed = false;

  constructor(options: StreamControllerOptions) {
    this.controller = options.controller;
    this.logger = options.logger;
  }

  send(event: StreamEvent): void {
    if (this.closed) return;

    const line = `data: ${JSON.stringify(event)}\n\n`;
    this.controller.enqueue(encoder.encode(line));

    // Create log event data, removing result field for tool_result events
    const logEventData =
      event.type === "tool_result"
        ? (() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { result: _result, ...rest } = event;
            return rest;
          })()
        : event;
    this.logger?.log("FRONTEND", `Sent SSE event: ${event.type}`, logEventData);
  }

  close(): void {
    if (!this.closed) {
      this.controller.close();
      this.closed = true;
    }
  }

  isClosed(): boolean {
    return this.closed;
  }
}
