"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async (value?: string) => {
    const trimmed = (value ?? input).trim();
    if (!trimmed || pending) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPending(true);

    const appendAssistantMessage = (addition: string) => {
      if (!addition) {
        return;
      }
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          next[lastIndex] = {
            ...next[lastIndex],
            content: next[lastIndex].content + addition,
          };
        } else {
          next.push({ role: "assistant", content: addition });
        }
        return next;
      });
    };

    const upsertAssistantMessage = (content: string) => {
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          next[lastIndex] = { ...next[lastIndex], content };
          return next;
        }
        return [...prev, { role: "assistant", content }];
      });
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        throw new Error("Server refused the request");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("The server response could not be streamed");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          appendAssistantMessage(chunk);
        }
      }

      reader.releaseLock();

      const finalChunk = decoder.decode();
      appendAssistantMessage(finalChunk);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reach the chat API.";
      upsertAssistantMessage(`Error: ${message}`);
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const sendDisabled = pending || input.trim().length === 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 to-zinc-900 px-4 py-8">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
        <header className="border-b border-white/10 px-6 py-4">
            <p className="text-lg font-semibold uppercase tracking-[0.3em] text-white/70">
              Gemini Stream Chat
            </p>
            <p className="text-sm text-white/50">
              Send a prompt and watch Gemini stream its response in plain text.
            </p>
          </header>

        <div
          role="log"
          aria-live="polite"
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto px-6 py-6"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-white/50">
              Start the conversation by typing a message below.
            </p>
          ) : (
            messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex flex-col gap-1 rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/40 transition ${
                      isUser
                        ? "items-end bg-blue-500 text-white"
                        : "items-start bg-white/5 text-white/90"
                    }`}
                  >
                    <span className="text-[0.65rem] uppercase tracking-[0.2em] text-white/60">
                      {isUser ? "You" : "Assistant"}
                    </span>
                    <p className="text-base">{message.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-white/10 bg-white/5 px-6 py-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type your message…"
              className="min-h-[56px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none"
              disabled={pending}
            />

            <button
              type="submit"
              disabled={sendDisabled}
              className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40"
            >
              {pending ? "Waiting…" : "Send"}
            </button>
          </div>

          <p className="mt-2 text-xs text-white/50">
            Enter sends, Shift+Enter adds a newline.
          </p>
        </form>
      </div>
    </div>
  );
}
