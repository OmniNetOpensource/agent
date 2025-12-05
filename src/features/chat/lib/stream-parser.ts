export type StreamEvent =
  | { type: "content"; content: string }
  | { type: "thinking"; content: string }
  | { type: "tool_call"; tool: string; args: Record<string, unknown> }
  | {
      type: "tool_progress";
      tool: string;
      stage: string;
      message: string;
      receivedBytes?: number;
      totalBytes?: number;
    }
  | { type: "tool_result"; tool: string; result: string | object }
  | { type: "error"; message: string }
  | {
      type: "conversation_created";
      conversationId: string;
      title: string;
      user_id: string;
      created_at: string;
      updated_at: string;
    }
  | {
      type: "conversation_updated";
      conversationId: string;
      updated_at: string;
    };

export type StreamParserCallbacks = {
  onEvent: (event: StreamEvent) => void;
  onError: (error: Error) => void;
};

export class StreamParser {
  private buffer = "";
  private decoder = new TextDecoder();

  constructor(private callbacks: StreamParserCallbacks) {}

  public parseChunk(value: Uint8Array) {
    this.buffer += this.decoder.decode(value, { stream: true });
    this.processBuffer();
  }

  private processBuffer() {
    const lines = this.buffer.split("\n\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      if (line.startsWith("data: ")) {
        try {
          const jsonStr = line.substring(6);
          const data = JSON.parse(jsonStr);
          this.callbacks.onEvent(data);
        } catch (e) {
          console.error("Failed to parse SSE data:", e, "line:", line);
          this.callbacks.onError(
            new Error(`Failed to parse SSE data: ${String(e)}`)
          );
        }
      }
    }
  }
}
