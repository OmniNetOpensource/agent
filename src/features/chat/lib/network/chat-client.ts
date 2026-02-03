import { SerializedMessage } from "@/src/features/chat/types/chat";
import { StreamParser, StreamEvent } from "./stream-parser";

type ChatClientOptions = {
  onEvent: (event: StreamEvent) => void;
  onError: (error: Error) => void;
  onFinish?: () => void;
};

export class ChatClient {
  private abortController: AbortController | null = null;

  constructor(private options: ChatClientOptions) {}

  public async sendMessage(
    messages: SerializedMessage[],
    role: string,
    conversationId: string | null
  ) {
    this.abortController = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: this.abortController.signal,
        body: JSON.stringify({
          conversationHistory: messages,
          conversationId: conversationId ?? null,
          role,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const statusText = response.statusText || "Unknown Status";
        let detail = "";

        try {
          const rawBody = await response.text();
          if (rawBody) {
            const clippedBody =
              rawBody.length > 500 ? `${rawBody.slice(0, 500)}…` : rawBody;
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              try {
                const data = JSON.parse(rawBody) as
                  | { reply?: unknown; error?: unknown }
                  | undefined;
                const reply =
                  typeof data?.reply === "string"
                    ? data.reply
                    : typeof data?.error === "string"
                      ? data.error
                      : "";
                detail = reply || clippedBody;
              } catch {
                detail = clippedBody;
              }
            } else {
              detail = clippedBody;
            }
          }
        } catch {
          // Ignore body parsing failures; fall back to status message.
        }

        const detailSuffix = detail ? ` - ${detail}` : "";
        throw new Error(
          `Chat API request failed: ${status} ${statusText}${detailSuffix}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(
          "Chat stream unavailable: response body is empty or locked"
        );
      }

      const parser = new StreamParser({
        onEvent: this.options.onEvent,
        onError: this.options.onError,
      });

      while (true) {
        const { value, done } = await reader.read();

        if (value) {
          parser.parseChunk(value);
        }

        if (done) break;
      }

      reader.releaseLock();
    } catch (error) {
      const isAbortError =
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError");

      if (!isAbortError) {
        this.options.onError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } finally {
      this.abortController = null;
      this.options.onFinish?.();
    }
  }

  public abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
