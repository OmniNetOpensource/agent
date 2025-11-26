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
import type { Conversation, DbMessage } from "@/types/conversation";

export type ChatState = {
  messages: Message[];
  input: string;
  pending: boolean;
  abortController: AbortController | null;
  currentModel: ChatModelId;
  pendingAttachments: Attachment[];
  conversations: Conversation[];
  conversationId: string | null;
  conversationsLoading: boolean;
};

type ToolLifecycleUpdate =
  | ({ kind: "tool_progress"; tool: string } & ToolProgress)
  | { kind: "tool_result"; tool: string; result: string };

type AssistantAddition = ContentBlock | ResearchItem | ToolLifecycleUpdate;

export type ChatActions = {
  setInput: (value: string) => void;
  setMessages: (messages: Message[]) => void;
  resetConversation: () => void;
  clearConversation: () => void;
  addAttachments: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  appendToAssistant: (addition: AssistantAddition) => void;
  sendMessage: (value?: string) => Promise<void>;
  stop: () => void;
  setCurrentModel: (model: ChatModelId) => void;
  fetchConversations: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  addConversation: (conversation: Conversation) => void;
};

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  messages: [],
  input: "",
  pending: false,
  abortController: null,
  currentModel: DEFAULT_CHAT_MODEL_ID,
  pendingAttachments: [],
  conversations: [],
  conversationId: null,
  conversationsLoading: false,
  setInput: (value) => set({ input: value }),
  setMessages: (messages) => set({ messages }),
  resetConversation: () =>
    set({
      messages: [],
      input: "",
      pending: false,
      pendingAttachments: [],
      conversationId: null,
      abortController: null,
    }),
  clearConversation: () => {
    const { resetConversation } = get();
    resetConversation();
  },
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
                  progress: [...(targetItem.data.progress ?? []), progressEntry],
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
  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const response = await fetch("/api/conversations", {
        cache: "no-cache",
      });
      if (!response.ok) {
        set({ conversations: [], conversationsLoading: false });
        return;
      }
      const data = (await response.json()) as {
        conversations?: Conversation[];
      };
      const conversations = Array.isArray(data.conversations)
        ? data.conversations
        : [];
      set({ conversations, conversationsLoading: false });
    } catch (error) {
      console.error("[Conversations] Failed to load", error);
      set({ conversationsLoading: false });
    }
  },
  addConversation: (conversation) =>
    set((state) => {
      const filtered = state.conversations.filter(
        (item) => item.id !== conversation.id
      );
      return { conversations: [conversation, ...filtered] };
    }),
  deleteConversation: async (id) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("删除会话失败");
      }

      set((state) => {
        const remaining = state.conversations.filter(
          (item) => item.id !== id
        );
        if (state.conversationId === id) {
          return {
            conversations: remaining,
            conversationId: null,
            messages: [],
            input: "",
            pending: false,
            abortController: null,
            pendingAttachments: [],
          };
        }
        return { conversations: remaining };
      });
    } catch (error) {
      console.error("[Conversations] Failed to delete", error);
      alert("删除会话失败，请稍后重试。");
    }
  },
  selectConversation: async (id) => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }

    set({
      pending: false,
      abortController: null,
      pendingAttachments: [],
      input: "",
      conversationId: id,
    });

    try {
      const response = await fetch(`/api/conversations/${id}/messages`, {
        cache: "no-cache",
      });
      if (!response.ok) {
        if (response.status === 401) {
          alert("请先登录以查看会话。");
        }
        throw new Error("加载会话失败");
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

      set({ messages: normalized, conversationId: id, pending: false });
    } catch (error) {
      console.error("[Conversations] Failed to load messages", error);
      set({ pending: false });
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

    const controller = new AbortController();

    set((state) => ({
      messages: [...state.messages, userMessage],
      input: "",
      pending: true,
      abortController: controller,
      pendingAttachments: [],
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          userMessage,
          conversationId: currentConversationId,
          isNewConversation:
            !currentConversationId && existingMessages.length === 0,
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
                    const title =
                      typeof data.title === "string" ? data.title : "新会话";
                    set({ conversationId: id });
                    get().addConversation({
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
        set((state) => {
          const existing = state.conversations.find(
            (item) => item.id === activeConversationId
          );
          if (!existing) {
            return { pending: false, abortController: null };
          }
          const updated = {
            ...existing,
            updated_at: new Date().toISOString(),
          };
          const remaining = state.conversations.filter(
            (item) => item.id !== activeConversationId
          );
          return {
            conversations: [updated, ...remaining],
            pending: false,
            abortController: null,
          };
        });
      } else {
        set({ pending: false, abortController: null });
      }
    }
  },
}));
