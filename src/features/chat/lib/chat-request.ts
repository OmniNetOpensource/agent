import { ChatClient } from "@/src/features/chat/lib/chat-client";
import { toast } from "@/src/shared/toast";
import { localDB } from "@/src/shared/lib/indexed-db";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";
import { buildConversationTitle } from "@/src/shared/utils/chatFormat";
import type {
  ContentBlock,
  Message,
  MessageTree,
  SerializedMessage,
} from "@/src/features/chat/types/chat";
import { serializeMessagesForRequest } from "./serialization";
import { cloneMessages, type AssistantAddition } from "./block-operations";

const generateLocalMessageId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export type StoreGetter = () => {
  messageTree: MessageTree;
  messages: Message[];
  conversationId: string | null;
  currentModel: string;
  searchEnabled: boolean;
  systemInstruction: string;
  pending: boolean;
  activeRequestId: string | null;
  appendToAssistant: (addition: AssistantAddition) => void;
};

type StoreState = {
  messageTree: MessageTree;
  messages: Message[];
  conversationId: string | null;
  pending: boolean;
  chatClient: ChatClient | null;
  activeRequestId: string | null;
};

export type StoreSetter = (
  partial:
    | Partial<StoreState>
    | ((state: StoreState) => Partial<StoreState>)
) => void;

type StartRequestOptions = {
  messages: Message[];
  navigate?: (path: string) => void;
  titleSource?: Message;
  preferLocalTitle?: boolean;
};

export const startChatRequest = async (
  get: StoreGetter,
  set: StoreSetter,
  options: StartRequestOptions
) => {
  const { messages, navigate, titleSource, preferLocalTitle } = options;
  const selectedModel = get().currentModel;

  if (get().pending) {
    return;
  }
  if (!selectedModel) {
    toast.warning("请先选择模型");
    return;
  }

  const searchEnabled = get().searchEnabled;
  const systemInstruction = get().systemInstruction;
  let currentConversationId = get().conversationId;

  const requestId = generateLocalMessageId();

  let serializedMessages: SerializedMessage[];
  try {
    serializedMessages = await serializeMessagesForRequest(messages);
  } catch (error) {
    console.error("Failed to serialize attachments", error);
    toast.error("附件处理失败，请稍后重试。");
    return;
  }

  const persistLocalConversation = async (
    id: string,
    options?: {
      title?: string;
      created_at?: string;
      updated_at?: string;
      messageTree?: MessageTree;
      messages?: Message[];
      titleSource?:
        | Message
        | { role: "user" | "assistant"; blocks: ContentBlock[] };
    }
  ) => {
    const now = options?.updated_at ?? new Date().toISOString();
    const existing = await localDB.get(id);
    const messageTree = options?.messageTree ?? get().messageTree;
    const currentMessages = cloneMessages(options?.messages ?? get().messages);
    const { pinnedConversations, normalConversations } =
      useConversationsStore.getState();
    const storedConversation = [
      ...pinnedConversations,
      ...normalConversations,
    ].find((item) => item.id === id);
    const pinned = storedConversation?.pinned ?? existing?.pinned;
    const pinned_at = storedConversation?.pinned_at ?? existing?.pinned_at;
    const resolvedTitleSource =
      options?.titleSource ??
      currentMessages.find((message) => message.role === "user") ??
      currentMessages[0];
    const title =
      options?.title ??
      existing?.title ??
      (resolvedTitleSource
        ? buildConversationTitle(resolvedTitleSource)
        : "新会话");
    const created_at = options?.created_at ?? existing?.created_at ?? now;

    await localDB.save({
      id,
      title,
      messageTree,
      messages: currentMessages,
      created_at,
      updated_at: now,
      pinned,
      pinned_at,
    });
  };

  const chatClient = new ChatClient({
    onEvent: (data) => {
      if (get().activeRequestId !== requestId) {
        return;
      }
      if (data.type === "conversation_created") {
        const id =
          typeof data.conversationId === "string" ? data.conversationId : null;
        if (id) {
          currentConversationId = id;
          set((state) => ({
            conversationId: state.conversationId ?? id,
          }));

          const serverTitle =
            typeof data.title === "string" ? data.title : "新会话";
          const fallbackTitle = titleSource
            ? buildConversationTitle(titleSource)
            : serverTitle;
          const resolvedTitle = preferLocalTitle
            ? fallbackTitle
            : serverTitle || fallbackTitle;
          const user_id = typeof data.user_id === "string" ? data.user_id : "";
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
            title: resolvedTitle,
            user_id,
            created_at,
            updated_at,
          });

          void persistLocalConversation(id, {
            title: resolvedTitle,
            created_at,
            updated_at,
            titleSource,
          });

          navigate?.(`/app/c/${id}`);
        }
        return;
      }

      if (data.type === "conversation_updated") {
        const id =
          typeof data.conversationId === "string" ? data.conversationId : null;
        const updated_at =
          typeof data.updated_at === "string"
            ? data.updated_at
            : new Date().toISOString();

        if (id) {
          void persistLocalConversation(id, { updated_at, titleSource });

          const { pinnedConversations, normalConversations, setConversations } =
            useConversationsStore.getState();
          const allConversations = [
            ...pinnedConversations,
            ...normalConversations,
          ];
          const existing = allConversations.find((item) => item.id === id);
          if (existing) {
            const updated = { ...existing, updated_at };
            const remaining = allConversations.filter((item) => item.id !== id);
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
        error instanceof Error ? error.message : "Unable to reach the chat API.";
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

      if (currentConversationId) {
        const now = new Date().toISOString();
        void persistLocalConversation(currentConversationId, {
          updated_at: now,
          titleSource,
        });
      }
    },
  });

  set({
    pending: true,
    chatClient,
    activeRequestId: requestId,
  });

  if (currentConversationId) {
    void persistLocalConversation(currentConversationId, {
      updated_at: new Date().toISOString(),
      titleSource,
    });
  }

  chatClient.sendMessage(
    serializedMessages,
    selectedModel,
    currentConversationId,
    searchEnabled,
    systemInstruction
  );
};
