"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import Markdown from "@/components/Markdown";

type ContentBlock = {
  type: "thinking" | "content" | "tool_call" | "tool_result";
  content: string;
  tool?: string; // 工具名称（用于 tool_call 和 tool_result）
  args?: Record<string, unknown>; // 工具参数（用于 tool_call）
};

type Message = {
  role: "user" | "assistant";
  blocks: ContentBlock[]; // 消息的内容块（按顺序包含思考和回答）
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(
    new Set()
  );
  const listRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (value?: string) => {
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

    const appendAssistantMessage = (addition: string, isThinking = false) => {
      if (!addition) {
        return;
      }
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;

        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          // 重要：创建 blocks 数组的深拷贝，避免直接修改之前的状态
          const blocks = [...(next[lastIndex].blocks || [])];
          const lastBlockIndex = blocks.length - 1;

          // 如果最后一个块的类型与当前类型相同，追加内容
          if (
            lastBlockIndex >= 0 &&
            blocks[lastBlockIndex].type ===
              (isThinking ? "thinking" : "content")
          ) {
            blocks[lastBlockIndex] = {
              ...blocks[lastBlockIndex],
              content: blocks[lastBlockIndex].content + addition,
            };
          } else {
            // 否则创建新块
            blocks.push({
              type: isThinking ? "thinking" : "content",
              content: addition,
            });
          }

          next[lastIndex] = {
            ...next[lastIndex],
            blocks: blocks,
          };
        } else {
          // 创建新的 assistant 消息
          next.push({
            role: "assistant",
            blocks: [
              {
                type: isThinking ? "thinking" : "content",
                content: addition,
              },
            ],
          });
        }
        return next;
      });
    };

    const appendAssistantBlock = (block: ContentBlock) => {
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;

        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          next[lastIndex] = {
            ...next[lastIndex],
            blocks: [...next[lastIndex].blocks, block],
          };
        } else {
          next.push({
            role: "assistant",
            blocks: [block],
          });
        }
        return next;
      });
    };

    const upsertAssistantMessage = (content: string) => {
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          next[lastIndex] = {
            ...next[lastIndex],
            blocks: [{ type: "content", content }],
          };
          return next;
        }
        return [
          ...prev,
          {
            role: "assistant",
            blocks: [{ type: "content", content }],
          },
        ];
      });
    };

    try {
      const conversationHistory = messages.map((msg) => {
        // 对于所有消息，合并所有 content 块（不包括 thinking）
        const contentBlocks =
          msg.blocks.filter((block) => block.type === "content");
        const content = contentBlocks
          .map((block) => block.content)
          .join("\n\n");
        return {
          role: msg.role,
          content,
        };
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

        // 先处理 value（如果有），即使 done=true 时也可能有最后的数据
        if (value) {
          buffer += decoder.decode(value, { stream: true });

          // 处理 SSE 格式的数据 (data: {...}\n\n)
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // 保留不完整的数据

          for (const line of lines) {
            // 跳过空行
            if (!line.trim()) continue;

            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.substring(6); // 移除 "data: " 前缀
                const data = JSON.parse(jsonStr);

                console.log("Parsed data:", data); // 添加调试日志

                if (data.type === "thinking") {
                  appendAssistantMessage(data.content, true);
                } else if (data.type === "content") {
                  appendAssistantMessage(data.content, false);
                } else if (data.type === "tool_call") {
                  // 添加工具调用块
                  appendAssistantBlock({
                    type: "tool_call",
                    content: `调用工具: ${data.tool}`,
                    tool: data.tool,
                    args: data.args,
                  });
                } else if (data.type === "tool_result") {
                  // 添加工具结果块
                  appendAssistantBlock({
                    type: "tool_result",
                    content: data.result,
                    tool: data.tool,
                  });
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e, "line:", line);
              }
            }
          }
        }

        // 再检查 done
        if (done) break;
      }

      reader.releaseLock();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to reach the chat API.";
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
      <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
        <header className="border-b border-white/10 px-6 py-4">
          <p className="text-lg font-semibold uppercase tracking-[0.3em] text-white/70">
            AI Chat with Thinking
          </p>
          <p className="text-sm text-white/50">
            Send a prompt and watch the AI stream its response with thinking
            process.
          </p>
        </header>

        <div
          role="log"
          aria-live="polite"
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-white/50">
              Start the conversation by typing a message below.
            </p>
          ) : (
            messages.map((message, index) => {
              const isUser = message.role === "user";
              const isLastMessage = index === messages.length - 1;
              const isStreaming = isLastMessage && pending;

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    isUser ? "justify-end" : "justify-start"
                  } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`flex flex-col gap-2 rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-lg shadow-black/40 transition-all max-w-[85%] ${
                      isUser
                        ? "items-end bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                        : "items-start bg-white/5 text-white/90 border border-white/5"
                    }`}
                  >
                    <span className="text-[0.65rem] uppercase tracking-[0.2em] font-medium text-white/60">
                      {isUser ? "You" : "Assistant"}
                    </span>

                    {/* 用户消息直接展示 */}
                    {isUser ? (
                      <div className="text-base w-full overflow-x-auto">
                        <Markdown content={message.blocks.find(b => b.type === "content")?.content || ""} />
                      </div>
                    ) : (
                      /* AI 消息按块展示（思考和回答交替） */
                      <div className="w-full flex flex-col gap-3">
                        {message.blocks.map((block, blockIndex) => {
                          const isThinkingBlock = block.type === "thinking";
                          const isToolCallBlock = block.type === "tool_call";
                          const isToolResultBlock = block.type === "tool_result";
                          const blockKey = `${index}-${blockIndex}`;
                          const isBlockExpanded = expandedThinking.has(
                            Number(`${index}${blockIndex}`)
                          );

                          // 思考过程块
                          if (isThinkingBlock) {
                            return (
                              <div key={blockKey} className="w-full">
                                <button
                                  onClick={() => {
                                    setExpandedThinking((prev) => {
                                      const newSet = new Set(prev);
                                      const key = Number(`${index}${blockIndex}`);
                                      if (isBlockExpanded) {
                                        newSet.delete(key);
                                      } else {
                                        newSet.add(key);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-xs text-blue-300 hover:text-blue-200 transition-all border border-blue-400/20 hover:border-blue-400/40"
                                >
                                  <span
                                    className="transition-transform duration-200"
                                    style={{
                                      transform: isBlockExpanded
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                    }}
                                  >
                                    ▶
                                  </span>
                                  <span className="font-medium">
                                    思考过程 #{blockIndex + 1}
                                  </span>
                                  <span className="text-white/40 text-[0.65rem]">
                                    ({block.content.length} 字符)
                                  </span>
                                  {isStreaming &&
                                    blockIndex ===
                                      message.blocks.length - 1 && (
                                      <span className="flex gap-1 ml-1">
                                        <span
                                          className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"
                                          style={{ animationDelay: "0ms" }}
                                        ></span>
                                        <span
                                          className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"
                                          style={{ animationDelay: "150ms" }}
                                        ></span>
                                        <span
                                          className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"
                                          style={{ animationDelay: "300ms" }}
                                        ></span>
                                      </span>
                                    )}
                                </button>

                                {isBlockExpanded && (
                                  <div className="mt-2 p-4 bg-black/30 rounded-xl border border-white/10 text-xs text-white/70 overflow-x-auto animate-in slide-in-from-top-2 duration-200 backdrop-blur-sm">
                                    <Markdown content={block.content} />
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // 工具调用块
                          if (isToolCallBlock) {
                            return (
                              <div key={blockKey} className="w-full">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-xs text-green-300 border border-green-400/20">
                                  <span className="font-mono">🔧</span>
                                  <span className="font-medium">{block.content}</span>
                                  {block.args && (
                                    <span className="text-white/40 text-[0.65rem]">
                                      {JSON.stringify(block.args).substring(0, 50)}...
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          // 工具结果块
                          if (isToolResultBlock) {
                            return (
                              <div key={blockKey} className="w-full">
                                <div className="p-3 bg-green-500/5 rounded-lg border border-green-400/10">
                                  <div className="text-[0.65rem] uppercase tracking-[0.15em] text-green-300/60 mb-1">
                                    {block.tool} 结果:
                                  </div>
                                  <div className="text-xs text-white/70 font-mono overflow-x-auto">
                                    {block.content}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // 普通内容块
                          return (
                            <div
                              key={blockKey}
                              className="text-base w-full overflow-x-auto"
                            >
                              <Markdown content={block.content} />
                              {isStreaming &&
                                blockIndex ===
                                  message.blocks.length - 1 && (
                                  <span className="inline-flex ml-1 w-0.5 h-4 bg-blue-400 animate-pulse"></span>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {pending &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "user" && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 rounded-2xl px-5 py-3.5 bg-white/5 border border-white/5">
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] font-medium text-white/60">
                    Assistant
                  </span>
                  <span className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </span>
                </div>
              </div>
            )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type your message…"
              className="min-h-[56px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none transition-colors"
              disabled={pending}
            />

            <button
              type="submit"
              disabled={sendDisabled}
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-blue-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:from-blue-500/40 disabled:to-blue-600/40 shadow-lg shadow-blue-500/20"
            >
              {pending ? "Thinking…" : "Send"}
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
