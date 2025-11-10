import { FormEvent, KeyboardEvent, useCallback, useState } from "react";
import { ContentBlock, Message, ResearchItem } from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  const appendToAssistant = useCallback(
    (addition: ContentBlock | ResearchItem) => {
      setMessages((prev) => {
        const next = [...prev];

        const ensureAssistantIndex = () => {
          const lastIndex = next.length - 1;
          if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
            return lastIndex;
          }
          next.push({ role: "assistant", blocks: [] });
          return next.length - 1;
        };

        if ("kind" in addition) {
          const assistantIndex = ensureAssistantIndex();
          const assistantMessage = next[assistantIndex];
          const blocks = [...assistantMessage.blocks];
          const lastBlock = blocks[blocks.length - 1];

          if (!lastBlock || lastBlock.type !== "research") {
            blocks.push({ type: "research", items: [addition] });
          } else {
            const items = [...lastBlock.items];
            const lastItem = items[items.length - 1];

            if (
              lastItem &&
              lastItem.kind === "thinking" &&
              addition.kind === "thinking"
            ) {
              items[items.length - 1] = {
                kind: "thinking",
                text: lastItem.text + addition.text,
              };
            } else {
              items.push(addition);
            }

            blocks[blocks.length - 1] = { ...lastBlock, items };
          }

          next[assistantIndex] = { ...assistantMessage, blocks };
          return next;
        }

        if (addition.type === "research") {
          const assistantIndex = ensureAssistantIndex();
          const assistantMessage = next[assistantIndex];
          const blocks = [...assistantMessage.blocks, addition];

          next[assistantIndex] = { ...assistantMessage, blocks };
          return next;
        }

        const additionText = addition.content;
        if (!additionText) {
          return next;
        }

        const assistantIndex = ensureAssistantIndex();
        const assistantMessage = next[assistantIndex];
        const blocks = [...assistantMessage.blocks];
        const lastBlock = blocks[blocks.length - 1];

        if (lastBlock?.type === "content") {
          blocks[blocks.length - 1] = {
            ...lastBlock,
            content: lastBlock.content + additionText,
          };
        } else {
          blocks.push({ type: "content", content: additionText });
        }

        next[assistantIndex] = { ...assistantMessage, blocks };
        return next;
      });
    },
    []
  );

  const sendMessage = useCallback(
    async (value?: string) => {
      const trimmed = (value ?? input).trim();
      if (!trimmed || pending) {
        return;
      }

      const userMessage: Message = {
        role: "user",
        blocks: [{ type: "content", content: trimmed }],
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setPending(true);

      try {
        const conversationHistory = messages.map((msg) => {
          const contentBlocks = msg.blocks.filter(
            (block) => block.type === "content"
          );
          const content = contentBlocks
            .map((block) => block.content)
            .join("\n\n");
          return { role: msg.role, content };
        });

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationHistory,
          }),
        });

        if (!response.ok) {
          throw new Error("Server refused the request");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("The server response could not be streamed");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();

          if (value) {
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;

              if (line.startsWith("data: ")) {
                try {
                  const jsonStr = line.substring(6);
                  const data = JSON.parse(jsonStr);

                  console.log("Parsed data:", data);

                  if (data.type === "thinking") {
                    appendToAssistant({
                      kind: "thinking",
                      text:
                        typeof data.content === "string"
                          ? data.content
                          : String(data.content ?? ""),
                    });
                  } else if (data.type === "tool_call") {
                    appendToAssistant({
                      kind: "tool_call",
                      tool:
                        typeof data.tool === "string" ? data.tool : "未知工具",
                      args:
                        (data.args && typeof data.args === "object"
                          ? data.args
                          : {}) as Record<string, unknown>,
                    });
                  } else if (data.type === "tool_result") {
                    let resultText: string;
                    if (typeof data.result === "string") {
                      resultText = data.result;
                    } else {
                      try {
                        resultText = JSON.stringify(data.result, null, 2);
                      } catch {
                        resultText = String(data.result ?? "");
                      }
                    }
                    appendToAssistant({
                      kind: "tool_result",
                      tool:
                        typeof data.tool === "string" ? data.tool : "未知工具",
                      result: resultText,
                    });
                  } else if (data.type === "content") {
                    const addition =
                      typeof data.content === "string"
                        ? data.content
                        : String(data.content ?? "");
                    appendToAssistant({ type: "content", content: addition });
                  }
                } catch (e) {
                  console.error("Failed to parse SSE data:", e, "line:", line);
                }
              }
            }
          }

          if (done) break;
        }

        reader.releaseLock();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to reach the chat API.";
        appendToAssistant({
          type: "content",
          content: `Error: ${message}`,
        });
      } finally {
        setPending(false);
      }
    },
    [appendToAssistant, input, messages, pending]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await sendMessage();
    },
    [sendMessage]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setInput("");
  }, []);

  return {
    messages,
    input,
    pending,
    setInput,
    sendMessage,
    handleSubmit,
    handleKeyDown,
    clearConversation,
  };
}
