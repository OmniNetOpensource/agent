import {
  Attachment,
  ContentBlock,
  Message,
  ResearchItem,
  ToolProgress,
} from "@/src/features/chat/types/chat";
import {
  MAX_ATTACHMENT_SIZE,
  detectAttachmentKind,
  uploadFileToStorage,
} from "@/src/shared/utils/file";
import { create } from "zustand";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";
import { ChatClient } from "@/src/features/chat/lib/chat-client";
import { useAuthStore } from "@/src/features/auth/store/useAuthStore";
import { toast } from "@/src/shared/toast";
import { localDB } from "@/src/shared/lib/indexed-db";
import { buildConversationTitle } from "@/src/shared/utils/chatFormat";
import { MODEL_CONFIGS } from "@/src/features/chat/lib/model-config";

export type ChatState = {
  messages: Message[];
  input: string;
  pending: boolean;
  chatClient: ChatClient | null;
  currentModel: string;
  pendingAttachments: Attachment[];
  uploading: boolean;
  conversationId: string | null;
  searchEnabled: boolean;
  systemInstruction: string;
  activeRequestId: string | null;
};

type ToolLifecycleUpdate =
  | ({ kind: "tool_progress"; tool: string } & ToolProgress)
  | { kind: "tool_result"; tool: string; result: string };

type AssistantAddition = ContentBlock | ResearchItem | ToolLifecycleUpdate;

export type ChatActions = {
  setInput: (value: string) => void;
  setMessages: (messages: Message[]) => void;
  setConversationId: (id: string | null) => void;
  clear: () => void;
  addAttachments: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  appendToAssistant: (addition: AssistantAddition) => void;
  sendMessage: (navigate?: (path: string) => void) => Promise<void>;
  stop: () => void;
  setCurrentModel: (model: string) => void;
  setSearchEnabled: (enabled: boolean) => void;
  setSystemInstruction: (instruction: string) => void;
};

const generateLocalMessageId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  messages: [],
  input: "",
  pending: false,
  chatClient: null,
  currentModel: "",
  pendingAttachments: [],
  uploading: false,
  conversationId: null,
  searchEnabled: true,
  systemInstruction: "",
  activeRequestId: null,
  setInput: (value) => set({ input: value }),
  setMessages: (messages) => set({ messages }),
  setConversationId: (id) => set({ conversationId: id }),
  setSearchEnabled: (enabled) => set({ searchEnabled: enabled }),
  setSystemInstruction: (instruction) =>
    set({ systemInstruction: instruction }),
  clear: () => {
    const client = get().chatClient;
    if (client) {
      client.abort();
    }
    set({
      messages: [],
      input: "",
      pending: false,
      pendingAttachments: [],
      uploading: false,
      conversationId: null,
      chatClient: null,
      searchEnabled: true,
      activeRequestId: null,
    });
  },
  addAttachments: async (files) => {
    const { user, loading } = useAuthStore.getState();

    if (loading) {
      toast.info("正在加载登录状态，请稍后再试。");
      return;
    }

    if (!user) {
      toast.warning("请先登录后再上传文件。");
      return;
    }

    const items = Array.from(files || []);
    if (items.length === 0) {
      return;
    }

    set({ uploading: true });

    const attachments: Attachment[] = [];

    for (const file of items) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.warning(
          `文件「${file.name}」超过限制（最大 ${(
            MAX_ATTACHMENT_SIZE /
            (1024 * 1024)
          ).toFixed(0)}MB），已跳过。`
        );
        continue;
      }

      try {
        const mimeType = file.type || "application/octet-stream";
        const url = await uploadFileToStorage(file, user.id);
        attachments.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          kind: detectAttachmentKind(mimeType),
          name: file.name,
          size: file.size,
          mimeType,
          url,
        });
      } catch (error) {
        console.error(`无法上传文件「${file.name}」`, error);
        toast.error(`无法上传文件「${file.name}」，请稍后重试。`);
      }
    }

    if (attachments.length === 0) {
      set({ uploading: false });
      return;
    }

    // 将新附件追加到现有待发送附件列表中
    set((state) => ({
      pendingAttachments: [...state.pendingAttachments, ...attachments],
      uploading: false,
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

      if (addition.type === "error") {
        const assistantIndex = ensureAssistantIndex();
        const assistantMessage = next[assistantIndex];
        const blocks = [...assistantMessage.blocks];

        blocks.push({ type: "error", message: addition.message });

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
    const { chatClient } = get();
    if (!chatClient) {
      set({ pending: false, chatClient: null, activeRequestId: null });
      return;
    }
    chatClient.abort();
    set({ pending: false, chatClient: null, activeRequestId: null });
  },
  setCurrentModel: (model) => {
    set({ currentModel: model });
  },
  sendMessage: async (navigate) => {
    const input = get().input;
    const trimmed = input.trim();
    const attachments = get().pendingAttachments;
    const selectedModel = get().currentModel;

    if (get().pending) {
      return;
    }
    if (!trimmed && attachments.length === 0) {
      return;
    }
    if (!selectedModel) {
      toast.warning("请先选择模型");
      return;
    }

    const searchEnabled = get().searchEnabled;
    const systemInstruction = get().systemInstruction;
    let currentConversationId = get().conversationId;
    const existingMessages = get().messages;
    const { user } = useAuthStore.getState();

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

    const requestId = generateLocalMessageId();

    // Track message IDs for incremental saving
    let localUserMessageId: string | null = null;
    let localAssistantMessageId: string | null = null;

    const chatClient = new ChatClient({
      onEvent: (data) => {
        if (get().activeRequestId !== requestId) {
          return;
        }
        if (data.type === "conversation_created") {
          const id =
            typeof data.conversationId === "string"
              ? data.conversationId
              : null;
          if (id) {
            currentConversationId = id;
            set((state) => ({
              ...state,
              conversationId: state.conversationId ?? id,
            }));

            const title =
              typeof data.title === "string" ? data.title : "新会话";
            const user_id =
              typeof data.user_id === "string" ? data.user_id : "";
            const created_at =
              typeof data.created_at === "string"
                ? data.created_at
                : new Date().toISOString();
            const updated_at =
              typeof data.updated_at === "string"
                ? data.updated_at
                : new Date().toISOString();
            const { addConversation } = useConversationsStore.getState();
            addConversation({
              id,
              title,
              user_id,
              created_at,
              updated_at,
            });

            if (!user) {
              const localTitle =
                existingMessages.length === 0
                  ? buildConversationTitle(userMessage)
                  : title;
              void localDB.saveConversation({
                id,
                title: localTitle,
                created_at,
                updated_at,
              });

              // Immediately save user message
              localUserMessageId = generateLocalMessageId();
              void localDB.saveMessage({
                id: localUserMessageId,
                conversation_id: id,
                role: "user",
                blocks: userMessage.blocks,
                created_at,
              });
            }

            navigate?.(`/app/c/${id}`);
          }
          return;
        }

        if (data.type === "conversation_updated") {
          const id =
            typeof data.conversationId === "string"
              ? data.conversationId
              : null;
          const updated_at =
            typeof data.updated_at === "string"
              ? data.updated_at
              : new Date().toISOString();

          if (id) {
            // Unauthenticated users: incrementally save assistant message
            if (!user) {
              const allMessages = get().messages;
              const assistant = [...allMessages]
                .reverse()
                .find((m) => m.role === "assistant");

              if (assistant) {
                if (!localAssistantMessageId) {
                  localAssistantMessageId = generateLocalMessageId();
                }
                void localDB.saveMessage({
                  id: localAssistantMessageId,
                  conversation_id: id,
                  role: "assistant",
                  blocks: assistant.blocks,
                  created_at: updated_at,
                });
              }

              // Update conversation timestamp
              void (async () => {
                const existing = await localDB.getConversation(id);
                if (existing) {
                  await localDB.saveConversation({ ...existing, updated_at });
                }
              })();
            }

            // Update conversations store
            const { conversations, setConversations } =
              useConversationsStore.getState();
            const existing = conversations.find((item) => item.id === id);
            if (existing) {
              const updated = { ...existing, updated_at };
              const remaining = conversations.filter((item) => item.id !== id);
              setConversations([updated, ...remaining]);
            }
          }
          return;
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
          const tool = typeof data.tool === "string" ? data.tool : "未知工具";
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
          const tool = typeof data.tool === "string" ? data.tool : "未知工具";
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
            typeof data.totalBytes === "number" ? data.totalBytes : undefined;

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
            tool: typeof data.tool === "string" ? data.tool : "未知工具",
            result: resultText,
          });
        } else if (data.type === "error") {
          const message =
            typeof data.message === "string"
              ? data.message
              : String(data.message ?? "");
          get().appendToAssistant({
            type: "error",
            message,
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
      },
      onError: (error) => {
        if (get().activeRequestId !== requestId) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Unable to reach the chat API.";
        get().appendToAssistant({
          type: "error",
          message: `Error: ${message}`,
        });
      },
      onFinish: () => {
        if (get().activeRequestId !== requestId) {
          return;
        }

        set({ pending: false, chatClient: null, activeRequestId: null });

        // Unauthenticated users: final save/update
        if (!user && currentConversationId) {
          const now = new Date().toISOString();
          const allMessages = get().messages;
          const assistant = [...allMessages]
            .reverse()
            .find((m) => m.role === "assistant");

          // If assistant message exists but hasn't been saved yet (no tool calls scenario)
          if (assistant) {
            if (!localAssistantMessageId) {
              localAssistantMessageId = generateLocalMessageId();
            }
            void localDB.saveMessage({
              id: localAssistantMessageId,
              conversation_id: currentConversationId,
              role: "assistant",
              blocks: assistant.blocks,
              created_at: now,
            });
          }

          // Update conversation timestamp
          void (async () => {
            const existing = await localDB.getConversation(
              currentConversationId as string
            );
            if (existing) {
              await localDB.saveConversation({ ...existing, updated_at: now });
            }
          })();
        }
      },
    });

    set({
      messages: nextMessages,
      input: "",
      pending: true,
      chatClient,
      pendingAttachments: [],
      activeRequestId: requestId,
    });

    chatClient.sendMessage(
      nextMessages,
      selectedModel,
      currentConversationId,
      searchEnabled,
      systemInstruction
    );
  },
}));

export const useIsNewChat = () =>
  useChatStore(
    (state) => state.conversationId === null && state.messages.length === 0
  );
