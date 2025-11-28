import {
  Attachment,
  ContentBlock,
  Message,
  ResearchItem,
  ToolProgress,
} from "@/src/features/chat/types/chat";
import {
  ChatModelId,
  DEFAULT_CHAT_MODEL_ID,
} from "@/src/features/model/lib/openrouter";
import {
  MAX_ATTACHMENT_SIZE,
  detectAttachmentKind,
  readFileAsDataUrl,
} from "@/src/shared/utils/file";
import { create } from "zustand";
import type { DbMessage } from "@/types/conversation";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";

export type ChatState = {
  messages: Message[];
  input: string;
  pending: boolean;
  abortController: AbortController | null;
  currentModel: ChatModelId;
  pendingAttachments: Attachment[];
  conversationId: string | null;
  latestSelectRequestId: number;
};

type ToolLifecycleUpdate =
  | ({ kind: "tool_progress"; tool: string } & ToolProgress)
  | { kind: "tool_result"; tool: string; result: string };

type AssistantAddition = ContentBlock | ResearchItem | ToolLifecycleUpdate;

export type ChatActions = {
  setInput: (value: string) => void;
  setMessages: (messages: Message[]) => void;
  setConversationId: (
    id: string | null,
    options?: { skipFetch?: boolean }
  ) => Promise<boolean | void>;
  clear: () => void;
  addAttachments: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  appendToAssistant: (addition: AssistantAddition) => void;
  sendMessage: (value?: string) => Promise<void>;
  stop: () => void;
  setCurrentModel: (model: ChatModelId) => void;
  selectConversation: (id: string, onFail?: () => void) => Promise<boolean>;
};

export const generateConversationId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  messages: [],
  input: "",
  pending: false,
  abortController: null,
  currentModel: DEFAULT_CHAT_MODEL_ID,
  pendingAttachments: [],
  conversationId: null,
  latestSelectRequestId: 0,
  setInput: (value) => set({ input: value }),
  setMessages: (messages) => set({ messages }),
  setConversationId: async (nextConversationId, options) => {
    const previousId = get().conversationId;
    const skipFetch = options?.skipFetch ?? false;

    if (previousId === nextConversationId) {
      return;
    }

    set((state) => {
      if (state.conversationId === nextConversationId) {
        return state;
      }
      return { ...state, conversationId: nextConversationId, messages: [] };
    });

    if (skipFetch || !nextConversationId || nextConversationId === "new") {
      return;
    }

    return get().selectConversation(nextConversationId, () => {
      set({ conversationId: "new", messages: [], pending: false });
    });
  },
  clear: () =>
    set({
      messages: [],
      input: "",
      pending: false,
      pendingAttachments: [],
      conversationId: "new",
      abortController: null,
    }),
  addAttachments: async (files) => {
    const items = Array.from(files || []);
    if (items.length === 0) {
      return;
    }

    const attachments: Attachment[] = [];

    for (const file of items) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        alert(
          `文件「${file.name}」超过限制（最大 ${(
            MAX_ATTACHMENT_SIZE /
            (1024 * 1024)
          ).toFixed(0)}MB），已跳过。`
        );
        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const mimeType = file.type || "application/octet-stream";
        attachments.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          kind: detectAttachmentKind(mimeType),
          name: file.name,
          size: file.size,
          mimeType,
          dataUrl,
        });
      } catch (error) {
        console.error(`无法读取文件「${file.name}」`, error);
        alert(`无法读取文件「${file.name}」，请重试。`);
      }
    }

    if (attachments.length === 0) {
      return;
    }

    // 只保留最新的一个附件（替换现有的）
    set(() => ({
      pendingAttachments: attachments.slice(0, 1),
    }));
  },
  removeAttachment: (id) =>
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter(
        (item) => item.id !== id
      ),
    })),
  appendToAssistant: (addition) =>
    set((state) => {
      const next = [...state.messages];

      const ensureAssistantIndex = () => {
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          return lastIndex;
        }
        next.push({ role: "assistant", blocks: [] });
        return next.length - 1;
      };

      const ensureResearchBlock = (blocks: ContentBlock[]) => {
        const lastBlock = blocks[blocks.length - 1];
        if (!lastBlock || lastBlock.type !== "research") {
          blocks.push({ type: "research", items: [] });
          return blocks.length - 1;
        }
        return blocks.length - 1;
      };

      const findToolIndex = (items: ResearchItem[], toolName: string) => {
        let fallback = -1;
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          if (item.kind === "tool" && item.data.call.tool === toolName) {
            if (!item.data.result) {
              return i;
            }
            if (fallback === -1) {
              fallback = i;
            }
          }
        }
        return fallback;
      };

      if ("kind" in addition) {
        if (addition.kind === "thinking") {
          const assistantIndex = ensureAssistantIndex();
          const assistantMessage = next[assistantIndex];
          const blocks = [...assistantMessage.blocks];
          const researchIndex = ensureResearchBlock(blocks);
          const researchBlock = blocks[researchIndex] as Extract<
            ContentBlock,
            { type: "research" }
          >;
          const items = [...researchBlock.items];
          const lastItem = items[items.length - 1];

          if (lastItem?.kind === "thinking") {
            items[items.length - 1] = {
              ...lastItem,
              text: lastItem.text + addition.text,
            };
          } else {
            items.push({ ...addition });
          }

          blocks[researchIndex] = {
            ...researchBlock,
            items,
          };

          next[assistantIndex] = { ...assistantMessage, blocks };
          return { messages: next };
        }

        if (addition.kind === "tool") {
          const assistantIndex = ensureAssistantIndex();
          const assistantMessage = next[assistantIndex];
          const blocks = [...assistantMessage.blocks];
          const researchIndex = ensureResearchBlock(blocks);
          const researchBlock = blocks[researchIndex] as Extract<
            ContentBlock,
            { type: "research" }
          >;

          blocks[researchIndex] = {
            ...researchBlock,
            items: [...researchBlock.items, { ...addition }],
          };

          next[assistantIndex] = { ...assistantMessage, blocks };
          return { messages: next };
        }

        if (addition.kind === "tool_progress") {
          const assistantIndex = ensureAssistantIndex();
          const assistantMessage = next[assistantIndex];
          const blocks = [...assistantMessage.blocks];
          const researchIndex = ensureResearchBlock(blocks);
          const researchBlock = blocks[researchIndex] as Extract<
            ContentBlock,
            { type: "research" }
          >;
          const items = [...researchBlock.items];
          const targetIndex = findToolIndex(items, addition.tool);
          const progressEntry: ToolProgress = {
            stage: addition.stage,
            message: addition.message,
            receivedBytes: addition.receivedBytes,
            totalBytes: addition.totalBytes,
          };

          if (targetIndex === -1) {
            items.push({
              kind: "tool",
              data: {
                call: { tool: addition.tool, args: {} },
                progress: [progressEntry],
              },
            });
          } else {
            const targetItem = items[targetIndex];
            if (targetItem.kind === "tool") {
              items[targetIndex] = {
                ...targetItem,
                data: {
                  ...targetItem.data,
                  progress: [
                    ...(targetItem.data.progress ?? []),
                    progressEntry,
                  ],
                },
              };
            }
          }

          blocks[researchIndex] = { ...researchBlock, items };
          next[assistantIndex] = { ...assistantMessage, blocks };
          return { messages: next };
        }

        if (addition.kind === "tool_result") {
          const assistantIndex = ensureAssistantIndex();
          const assistantMessage = next[assistantIndex];
          const blocks = [...assistantMessage.blocks];
          const researchIndex = ensureResearchBlock(blocks);
          const researchBlock = blocks[researchIndex] as Extract<
            ContentBlock,
            { type: "research" }
          >;
          const items = [...researchBlock.items];
          const targetIndex = findToolIndex(items, addition.tool);

          if (targetIndex === -1) {
            items.push({
              kind: "tool",
              data: {
                call: { tool: addition.tool, args: {} },
                result: { result: addition.result },
              },
            });
          } else {
            const targetItem = items[targetIndex];
            if (targetItem.kind === "tool") {
              items[targetIndex] = {
                ...targetItem,
                data: {
                  ...targetItem.data,
                  result: { result: addition.result },
                },
              };
            }
          }

          blocks[researchIndex] = { ...researchBlock, items };
          next[assistantIndex] = { ...assistantMessage, blocks };
          return { messages: next };
        }
      }

      if (addition.type === "research") {
        const assistantIndex = ensureAssistantIndex();
        const assistantMessage = next[assistantIndex];
        const blocks = [...assistantMessage.blocks];

        const normalizedItems = addition.items.map((item) => ({ ...item }));

        blocks.push({
          type: "research",
          items: normalizedItems,
        });

        next[assistantIndex] = { ...assistantMessage, blocks };
        return { messages: next };
      }

      if (addition.type !== "content") {
        return { messages: next };
      }

      const additionText = addition.content;
      if (!additionText) {
        return { messages: next };
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
      return { messages: next };
    }),
  stop: () => {
    const { abortController } = get();
    if (!abortController) {
      return;
    }
    abortController.abort();
    set({ pending: false, abortController: null });
  },
  setCurrentModel: (model) => {
    set({ currentModel: model });
  },
  selectConversation: async (id, onFail) => {
    if (!id || id === "new") {
      return false;
    }

    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }

    const requestId = get().latestSelectRequestId + 1;

    set({ latestSelectRequestId: requestId });

    try {
      const response = await fetch(`/api/conversations/${id}/messages`, {
        cache: "no-cache",
      });
      if (!response.ok) {
        if (get().latestSelectRequestId === requestId) {
          onFail?.();
        }
        return false;
      }

      const data = (await response.json()) as { messages?: DbMessage[] };
      const normalized: Message[] = (data.messages ?? []).map((msg) => ({
        role: msg.role,
        blocks: Array.isArray(msg.blocks)
          ? msg.blocks.map((block) =>
              block.type === "research"
                ? { ...block, items: block.items.map((item) => ({ ...item })) }
                : { ...block }
            )
          : [],
      }));

      if (get().latestSelectRequestId !== requestId) {
        return false;
      }

      set({ messages: normalized, conversationId: id, pending: false });
      return true;
    } catch (error) {
      console.error("[Conversations] Failed to load messages", error);
      set({ pending: false });
      if (get().latestSelectRequestId === requestId) {
        onFail?.();
      }
      return false;
    }
  },
  sendMessage: async (value) => {
    const trimmed = (value ?? get().input).trim();
    const attachments = get().pendingAttachments;
    if (get().pending) {
      return;
    }
    if (!trimmed && attachments.length === 0) {
      return;
    }

    const selectedModel = get().currentModel;
    const currentConversationId = get().conversationId;
    const existingMessages = get().messages;

    const userBlocks: ContentBlock[] = [];
    if (trimmed) {
      userBlocks.push({ type: "content", content: trimmed });
    }
    if (attachments.length > 0) {
      userBlocks.push({ type: "attachments", attachments });
    }

    const userMessage: Message = {
      role: "user",
      blocks: userBlocks,
    };

    const nextMessages = [...existingMessages, userMessage];
    const controller = new AbortController();

    set({
      messages: nextMessages,
      input: "",
      pending: true,
      abortController: controller,
      pendingAttachments: [],
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          conversationHistory: nextMessages,
          conversationId:
            currentConversationId && currentConversationId !== "new"
              ? currentConversationId
              : null,
          model: selectedModel,
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

                if (data.type === "conversation_created") {
                  const id =
                    typeof data.conversationId === "string"
                      ? data.conversationId
                      : null;
                  if (id) {
                    set({ conversationId: id });
                    const title =
                      typeof data.title === "string" ? data.title : "新会话";
                    const { addConversation } =
                      useConversationsStore.getState();
                    addConversation({
                      id,
                      title,
                      user_id: "",
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    });
                  }
                  continue;
                }

                if (data.type === "thinking") {
                  get().appendToAssistant({
                    kind: "thinking",
                    text:
                      typeof data.content === "string"
                        ? data.content
                        : String(data.content ?? ""),
                  });
                } else if (data.type === "tool_call") {
                  const tool =
                    typeof data.tool === "string" ? data.tool : "未知工具";
                  get().appendToAssistant({
                    kind: "tool",
                    data: {
                      call: {
                        tool,
                        args: (data.args && typeof data.args === "object"
                          ? data.args
                          : {}) as Record<string, unknown>,
                      },
                      progress: [],
                    },
                  });
                } else if (data.type === "tool_progress") {
                  const tool =
                    typeof data.tool === "string" ? data.tool : "未知工具";
                  const stage =
                    typeof data.stage === "string" ? data.stage : "progress";
                  const message =
                    typeof data.message === "string"
                      ? data.message
                      : String(data.message ?? "");
                  const receivedBytes =
                    typeof data.receivedBytes === "number"
                      ? data.receivedBytes
                      : undefined;
                  const totalBytes =
                    typeof data.totalBytes === "number"
                      ? data.totalBytes
                      : undefined;

                  get().appendToAssistant({
                    kind: "tool_progress",
                    tool,
                    stage,
                    message,
                    receivedBytes,
                    totalBytes,
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
                  get().appendToAssistant({
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
                  get().appendToAssistant({
                    type: "content",
                    content: addition,
                  });
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
      const isAbortError =
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError");
      if (isAbortError) {
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Unable to reach the chat API.";
      get().appendToAssistant({
        type: "content",
        content: `Error: ${message}`,
      });
    } finally {
      const activeConversationId = get().conversationId;
      if (activeConversationId) {
        const { conversations, setConversations } =
          useConversationsStore.getState();
        const existing = conversations.find(
          (item) => item.id === activeConversationId
        );
        if (existing) {
          const updated = {
            ...existing,
            updated_at: new Date().toISOString(),
          };
          const remaining = conversations.filter(
            (item) => item.id !== activeConversationId
          );
          setConversations([updated, ...remaining]);
        }
        set({ pending: false, abortController: null });
      } else {
        set({ pending: false, abortController: null });
      }
    }
  },
}));
