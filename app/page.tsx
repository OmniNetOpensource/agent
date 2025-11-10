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
  const [expandedTools, setExpandedTools] = useState<Set<number>>(
    new Set()
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // 莫兰蒂配色主题定义
  const theme = {
    light: {
      bg: "bg-linear-to-br from-[#f5f3f0] via-[#e8e5e1] to-[#ebe9e5]",
      bgGlow1: "from-[#b8a99a]/15",
      bgGlow2: "from-[#9d9a92]/15",
      headerBg: "bg-white/60",
      headerBorder: "border-[#d4cfc8]/30",
      headerText: "text-[#5d5954]",
      headerSubtext: "text-[#7a7672]",
      clearBtn: "border-[#d4cfc8]/40 bg-[#c9bfb5]/20 text-[#5d5954] hover:border-[#b8a99a]/60 hover:bg-[#c9bfb5]/30 hover:shadow-[#b8a99a]/20 disabled:border-[#d4cfc8]/20 disabled:bg-[#c9bfb5]/10 disabled:text-[#a39e99]",
      emptyText: "text-[#7a7672]",
      emptySubtext: "text-[#9d9a92]",
      userBubble: "bg-linear-to-br from-[#d4a5a5] via-[#c9a9a0] to-[#b8a99a] text-white shadow-[#d4a5a5]/25",
      userLabel: "text-white/90",
      assistantBubble: "bg-white/70 text-[#5d5954] border-[#d4cfc8]/40 shadow-[#9d9a92]/15",
      assistantLabel: "text-[#7a7672]",
      thinkingBtn: "bg-[#a8b5a8]/20 hover:bg-[#a8b5a8]/30 text-[#6b7a6b] hover:text-[#5d6b5d] border-[#a8b5a8]/30 hover:border-[#a8b5a8]/50",
      thinkingDot: "bg-[#a8b5a8]",
      thinkingExpanded: "bg-white/50 border-[#d4cfc8]/30 text-[#5d5954]",
      toolCall: "bg-[#d9b596]/20 text-[#8a6f54] border-[#d9b596]/30",
      toolResult: "bg-[#d9b596]/10 border-[#d9b596]/20",
      toolResultLabel: "text-[#8a6f54]/80",
      toolResultContent: "text-[#5d5954]",
      cursor: "bg-[#d4a5a5]",
      loadingBubble: "bg-white/70 border-[#d4cfc8]/40",
      loadingLabel: "text-[#7a7672]",
      loadingDot: "bg-[#d4a5a5]",
      formBg: "bg-white/60",
      formBorder: "border-[#d4cfc8]/30",
      inputBg: "bg-white/50",
      inputBorder: "border-[#d4cfc8]/40",
      inputText: "text-[#5d5954]",
      inputPlaceholder: "placeholder:text-[#9d9a92]",
      inputFocus: "focus:border-[#c9a9a0]/60 focus:bg-white/70 focus:ring-[#d4a5a5]/25",
      hint: "text-[#9d9a92]",
      sendBtn: "bg-linear-to-r from-[#c9a9a0] via-[#d4a5a5] to-[#b8a99a] hover:shadow-[#d4a5a5]/30",
      secondary: "text-[#9d9a92]",
    },
    dark: {
      bg: "bg-linear-to-br from-[#2a2826] via-[#1f1e1c] to-[#252320]",
      bgGlow1: "from-[#b8a99a]/20",
      bgGlow2: "from-[#9d9a92]/20",
      headerBg: "bg-black/40",
      headerBorder: "border-[#3a3633]/50",
      headerText: "text-[#e5ddd5]",
      headerSubtext: "text-[#b8b3ad]",
      clearBtn: "border-[#3a3633]/60 bg-[#3a3633]/30 text-[#e5ddd5] hover:border-[#4a453f]/80 hover:bg-[#3a3633]/50 hover:shadow-[#b8a99a]/15 disabled:border-[#3a3633]/30 disabled:bg-[#3a3633]/20 disabled:text-[#6a655f]",
      emptyText: "text-[#b8b3ad]",
      emptySubtext: "text-[#7a7672]",
      userBubble: "bg-linear-to-br from-[#a87b7b] via-[#9d817a] to-[#8d7a6f] text-white shadow-[#a87b7b]/30",
      userLabel: "text-white/90",
      assistantBubble: "bg-[#3a3633]/60 text-[#e5ddd5] border-[#4a453f]/50 shadow-black/20",
      assistantLabel: "text-[#b8b3ad]",
      thinkingBtn: "bg-[#7a8a7a]/20 hover:bg-[#7a8a7a]/30 text-[#a8b5a8] hover:text-[#b8c5b8] border-[#7a8a7a]/30 hover:border-[#7a8a7a]/50",
      thinkingDot: "bg-[#a8b5a8]",
      thinkingExpanded: "bg-black/30 border-[#3a3633]/40 text-[#d5cdc5]",
      toolCall: "bg-[#a88b6f]/20 text-[#d9b596] border-[#a88b6f]/30",
      toolResult: "bg-[#a88b6f]/10 border-[#a88b6f]/20",
      toolResultLabel: "text-[#d9b596]/90",
      toolResultContent: "text-[#d5cdc5]",
      cursor: "bg-[#a87b7b]",
      loadingBubble: "bg-[#3a3633]/60 border-[#4a453f]/50",
      loadingLabel: "text-[#b8b3ad]",
      loadingDot: "bg-[#a87b7b]",
      formBg: "bg-black/40",
      formBorder: "border-[#3a3633]/50",
      inputBg: "bg-[#2a2826]/80",
      inputBorder: "border-[#3a3633]/60",
      inputText: "text-[#e5ddd5]",
      inputPlaceholder: "placeholder:text-[#7a7672]",
      inputFocus: "focus:border-[#9d817a]/60 focus:bg-[#2a2826] focus:ring-[#a87b7b]/20",
      hint: "text-[#7a7672]",
      sendBtn: "bg-linear-to-r from-[#9d817a] via-[#a87b7b] to-[#8d7a6f] hover:shadow-[#a87b7b]/25",
      secondary: "text-[#7a7672]",
    }
  };

  const colors = isDarkMode ? theme.dark : theme.light;

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

  const canClearConversation = !pending && messages.length > 0;

  const handleClearConversation = () => {
    if (!canClearConversation) {
      return;
    }
    setMessages([]);
    setExpandedThinking(new Set());
    setExpandedTools(new Set());
  };

  const sendDisabled = pending || input.trim().length === 0;

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden ${colors.bg} transition-colors duration-500`}>
      {/* 背景装饰光效 - 莫兰蒂色系 */}
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] ${colors.bgGlow1} via-transparent to-transparent pointer-events-none`}></div>
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] ${colors.bgGlow2} via-transparent to-transparent pointer-events-none`}></div>
      
      <div className="relative flex h-full w-full flex-col overflow-hidden backdrop-blur-3xl">
        <header className={`shrink-0 border-b ${colors.headerBorder} ${colors.headerBg} px-8 py-4 backdrop-blur-xl transition-colors duration-500`}>
          <div className="flex items-center justify-end">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`group flex items-center justify-center gap-2 rounded-xl border ${colors.clearBtn} backdrop-blur-xl transition-all duration-300 px-5 py-2.5 text-sm font-medium`}
                title={isDarkMode ? "切换到浅色模式" : "切换到暗色模式"}
              >
                <span className="text-base transition-transform duration-500">
                  {isDarkMode ? "☀️" : "🌙"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleClearConversation}
                disabled={!canClearConversation}
                className={`group flex items-center justify-center gap-2 rounded-xl border ${colors.clearBtn} backdrop-blur-xl transition-all duration-300 px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:shadow-none`}
              >
                <span className="text-base group-hover:rotate-180 transition-transform duration-500" aria-hidden="true">⟲</span>
                <span>清空对话</span>
              </button>
            </div>
          </div>
        </header>

        <div
          role="log"
          aria-live="polite"
          ref={listRef}
          className="flex-1 space-y-6 overflow-y-auto px-8 py-8"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
            </div>
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
                  } animate-in fade-in slide-in-from-bottom-2 duration-500`}
                >
                  <div
                    className={`flex flex-col gap-2.5 rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-xl transition-all duration-500 max-w-[85%] backdrop-blur-xl ${
                      isUser
                        ? `items-end ${colors.userBubble}`
                        : `items-start ${colors.assistantBubble} border`
                    }`}
                  >
                    <span className={`text-[0.7rem] uppercase tracking-[0.25em] font-semibold transition-colors duration-500 ${isUser ? colors.userLabel : colors.assistantLabel}`}>
                      {isUser ? "你" : "AI助手"}
                    </span>

                    {/* 用户消息直接展示 */}
                    {isUser ? (
                      <div className="text-base w-full overflow-x-auto">
                        <Markdown content={message.blocks.find(b => b.type === "content")?.content || ""} />
                      </div>
                    ) : (
                      /* AI 消息按块展示（思考和回答交替） */
                      <div className="w-full flex flex-col gap-4">
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
                                  className={`group flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-xs transition-all duration-300 border backdrop-blur-sm ${colors.thinkingBtn}`}
                                >
                                  <span
                                    className="transition-transform duration-300 text-sm"
                                    style={{
                                      transform: isBlockExpanded
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                    }}
                                  >
                                    ▶
                                  </span>
                                  <span className="font-semibold shrink-0">
                                    思考过程 #{blockIndex + 1}
                                  </span>
                                  <span className={`text-[0.65rem] transition-colors duration-500 ${colors.secondary}`}>
                                    {block.content.length} 字符
                                  </span>
                                  {isStreaming &&
                                    blockIndex ===
                                      message.blocks.length - 1 && (
                                      <span className="flex gap-1.5 ml-auto">
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full animate-pulse ${colors.thinkingDot}`}
                                          style={{ animationDelay: "0ms" }}
                                        ></span>
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full animate-pulse ${colors.thinkingDot}`}
                                          style={{ animationDelay: "150ms" }}
                                        ></span>
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full animate-pulse ${colors.thinkingDot}`}
                                          style={{ animationDelay: "300ms" }}
                                        ></span>
                                      </span>
                                    )}
                                </button>

                                {isBlockExpanded && (
                                  <div className={`mt-3 p-5 rounded-xl border text-xs overflow-x-auto animate-in slide-in-from-top-2 backdrop-blur-xl transition-colors duration-500 ${colors.thinkingExpanded}`}>
                                    <Markdown content={block.content} />
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // 工具调用块
                          if (isToolCallBlock) {
                            const toolKey = Number(`${index}${blockIndex}`);
                            const isToolExpanded = expandedTools.has(toolKey);
                            
                            return (
                              <div key={blockKey} className="w-full">
                                <button
                                  onClick={() => {
                                    setExpandedTools((prev) => {
                                      const newSet = new Set(prev);
                                      if (isToolExpanded) {
                                        newSet.delete(toolKey);
                                      } else {
                                        newSet.add(toolKey);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className={`group flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-xs border backdrop-blur-sm transition-all duration-300 ${colors.toolCall}`}
                                >
                                  <span
                                    className="transition-transform duration-300 text-sm"
                                    style={{
                                      transform: isToolExpanded
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                    }}
                                  >
                                    ▶
                                  </span>
                                  <span className="text-base">🔧</span>
                                  <span className="font-semibold shrink-0">{block.content}</span>
                                </button>
                                
                                {isToolExpanded && block.args && (
                                  <div className={`mt-2 p-4 rounded-xl border backdrop-blur-sm transition-colors duration-500 ${colors.toolResult}`}>
                                    <div className={`text-[0.65rem] uppercase tracking-[0.15em] font-semibold mb-2 transition-colors duration-500 ${colors.toolResultLabel}`}>
                                      调用参数
                                    </div>
                                    <pre className={`text-xs font-mono overflow-x-auto transition-colors duration-500 ${colors.toolResultContent}`}>
                                      {JSON.stringify(block.args, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // 工具结果块
                          if (isToolResultBlock) {
                            const toolResultKey = Number(`1${index}${blockIndex}`);
                            const isResultExpanded = expandedTools.has(toolResultKey);
                            const contentPreview = block.content.length > 80 
                              ? block.content.substring(0, 80) + "..." 
                              : block.content;
                            
                            return (
                              <div key={blockKey} className="w-full">
                                <button
                                  onClick={() => {
                                    setExpandedTools((prev) => {
                                      const newSet = new Set(prev);
                                      if (isResultExpanded) {
                                        newSet.delete(toolResultKey);
                                      } else {
                                        newSet.add(toolResultKey);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className={`group flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-xs border backdrop-blur-sm transition-all duration-300 ${colors.toolCall}`}
                                >
                                  <span
                                    className="transition-transform duration-300 text-sm"
                                    style={{
                                      transform: isResultExpanded
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                    }}
                                  >
                                    ▶
                                  </span>
                                  <span className="text-base">✅</span>
                                  <span className="font-semibold shrink-0">{block.tool} 结果</span>
                                  {!isResultExpanded && (
                                    <span className={`text-[0.65rem] truncate flex-1 transition-colors duration-500 ${colors.secondary}`}>
                                      {contentPreview}
                                    </span>
                                  )}
                                </button>
                                
                                {isResultExpanded && (
                                  <div className={`mt-2 p-4 rounded-xl border backdrop-blur-sm transition-colors duration-500 ${colors.toolResult}`}>
                                    <pre className={`text-xs font-mono overflow-x-auto whitespace-pre-wrap transition-colors duration-500 ${colors.toolResultContent}`}>
                                      {block.content}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // 普通内容块
                          return (
                            <div
                              key={blockKey}
                              className="text-base w-full overflow-x-auto leading-relaxed"
                            >
                              <Markdown content={block.content} />
                              {isStreaming &&
                                blockIndex ===
                                  message.blocks.length - 1 && (
                                  <span className={`inline-flex ml-1 w-0.5 h-5 animate-pulse ${colors.cursor}`}></span>
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
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className={`flex items-center gap-3 rounded-2xl px-6 py-4 border backdrop-blur-xl transition-colors duration-500 ${colors.loadingBubble}`}>
                  <span className={`text-[0.7rem] uppercase tracking-[0.25em] font-semibold transition-colors duration-500 ${colors.loadingLabel}`}>
                    AI助手
                  </span>
                  <span className="flex gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full animate-bounce ${colors.loadingDot}`}
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className={`w-2 h-2 rounded-full animate-bounce ${colors.loadingDot}`}
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className={`w-2 h-2 rounded-full animate-bounce ${colors.loadingDot}`}
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </span>
                </div>
              </div>
            )}
        </div>

        <form
          onSubmit={handleSubmit}
          className={`shrink-0 border-t ${colors.formBorder} ${colors.formBg} px-8 py-6 backdrop-blur-xl transition-colors duration-500`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="输入您的消息..."
                className={`w-full min-h-[60px] resize-none rounded-xl border px-5 py-4 text-sm focus:outline-none focus:ring-2 transition-all duration-500 backdrop-blur-xl ${colors.inputBorder} ${colors.inputBg} ${colors.inputText} ${colors.inputPlaceholder} ${colors.inputFocus}`}
              />
            </div>

            <button
              type="submit"
              disabled={sendDisabled}
              className={`group relative rounded-xl px-8 py-4 text-sm font-semibold text-white transition-all duration-500 hover:shadow-2xl hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:scale-100 disabled:shadow-none overflow-hidden ${colors.sendBtn}`}
            >
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              <span className="relative">
                {pending ? "思考中..." : "发送"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
