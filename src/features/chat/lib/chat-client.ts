import { SerializedMessage } from "@/src/features/chat/types/chat";
import { StreamParser, StreamEvent } from "./stream-parser";

export type ChatClientOptions = {
  onEvent: (event: StreamEvent) => void;
  onError: (error: Error) => void;
  onFinish?: () => void;
};

export class ChatClient {
  private abortController: AbortController | null = null;

  constructor(private options: ChatClientOptions) {}

  public async sendMessage(
    messages: SerializedMessage[],
    model: string,
    conversationId: string | null,
    searchEnabled?: boolean,
    systemInstruction?: string
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
          model,
          searchEnabled,
          systemInstruction,
        }),
      });

      if (!response.ok) {
        throw new Error("Server refused the request");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("The server response could not be streamed");
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
