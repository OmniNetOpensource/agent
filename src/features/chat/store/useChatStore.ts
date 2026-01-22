import {
  Attachment,
  EditingState,
  Message,
  BranchInfo,
} from "@/src/features/chat/types/chat";
import { revokeBlobUrl } from "@/src/shared/utils/file";
import { create } from "zustand";
import { ChatClient } from "@/src/features/chat/lib/chat-client";
import { toast } from "@/src/shared/toast";
import { localDB } from "@/src/shared/lib/indexed-db";
import { buildConversationTitle } from "@/src/shared/utils/chatFormat";
import {
  addMessage,
  buildCurrentPath,
  computeMessagesFromPath,
  createEmptyMessageState,
  createLinearMessages,
  editMessage,
  getBranchInfo,
  switchBranch,
  cloneBlocks,
} from "@/src/features/chat/lib/message-tree";
import {
  cloneMessages,
  extractContentFromBlocks,
  extractAttachmentsFromBlocks,
  collectAttachmentIds,
  buildUserBlocks,
  applyAssistantAddition,
  type AssistantAddition,
} from "@/src/features/chat/lib/block-operations";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";
import {
  revokeAttachments,
  revokeTreeAttachments,
  buildAttachmentsFromFiles,
} from "@/src/features/chat/lib/attachment-operations";
import { startChatRequest } from "@/src/features/chat/lib/chat-request";

type ChatState = {
  messages: Message[];
  currentPath: number[];
  latestRootId: number | null;
  nextId: number;
  editingState: EditingState | null;
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

type ChatActions = {
  setInput: (value: string) => void;
  setMessages: (messages: Message[]) => void;
  setConversationId: (id: string | null) => void;
  clear: () => void;
  addAttachments: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  appendToAssistant: (addition: AssistantAddition) => void;
  sendMessage: (navigate?: (path: string) => void) => Promise<void>;
  startEditing: (messageId: number) => void;
  updateEditContent: (content: string) => void;
  updateEditAttachments: (attachments: Attachment[]) => void;
  cancelEditing: () => void;
  submitEdit: (depth: number, navigate?: (path: string) => void) => Promise<void>;
  retryFromMessage: (
    messageId: number,
    depth: number,
    navigate?: (path: string) => void
  ) => Promise<void>;
  branchToNewConversation: (
    messageId: number,
    navigate: (path: string) => void
  ) => Promise<void>;
  getBranchInfo: (messageId: number) => BranchInfo | null;
  navigateBranch: (
    messageId: number,
    depth: number,
    direction: "prev" | "next"
  ) => void;
  initializeTree: (
    messages?: Message[],
    currentPath?: number[]
  ) => void;
  getMessagesFromPath: () => Message[];
  stop: () => void;
  setCurrentModel: (model: string) => void;
  setSearchEnabled: (enabled: boolean) => void;
  setSystemInstruction: (instruction: string) => void;
};

// Create a stable-ish client id without requiring a backend.
const generateConversationId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  ...createEmptyMessageState(),
  editingState: null,
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
  setMessages: (messages) => {
    const existingMessages = get().messages;
    if (existingMessages.length > 0) {
      revokeTreeAttachments(existingMessages);
    }
    // Normalize to a linear tree so branch navigation works with simple lists.
    const linearState = createLinearMessages(
      messages.map((message) => ({
        role: message.role,
        blocks: message.blocks ?? [],
        createdAt: message.createdAt,
      }))
    );
    set({
      messages: linearState.messages,
      currentPath: linearState.currentPath,
      latestRootId: linearState.latestRootId,
      nextId: linearState.nextId,
      editingState: null,
    });
  },
  initializeTree: (messages = [], currentPath = []) => {
    const existingMessages = get().messages;
    if (existingMessages.length > 0) {
      revokeTreeAttachments(existingMessages);
    }

    const resolvedCurrentPath =
      Array.isArray(currentPath) && currentPath.every((id) => typeof id === "number")
        ? currentPath
        : [];
    const fallbackRootId = messages.length > 0 ? messages[0].id : null;
    const nextPath =
      resolvedCurrentPath.length > 0
        ? resolvedCurrentPath
        : buildCurrentPath(messages, fallbackRootId);
    const latestRootId = nextPath[0] ?? fallbackRootId;
    const nextId =
      messages.reduce((maxId, message) => Math.max(maxId, message.id), 0) + 1;

    set({
      messages,
      currentPath: nextPath,
      latestRootId,
      nextId,
      editingState: null,
    });
  },
  getMessagesFromPath: () =>
    computeMessagesFromPath(get().messages, get().currentPath),
  setConversationId: (id) => set({ conversationId: id }),
  setSearchEnabled: (enabled) => set({ searchEnabled: enabled }),
  setSystemInstruction: (instruction) =>
    set({ systemInstruction: instruction }),
  clear: () => {
    const client = get().chatClient;
    if (client) {
      client.abort();
    }
    // Clean up any object URLs created for attachments.
    revokeTreeAttachments(get().messages);
    revokeAttachments(get().pendingAttachments);
    const editingState = get().editingState;
    if (editingState) {
      revokeAttachments(editingState.editedAttachments);
    }
    set({
      ...createEmptyMessageState(),
      editingState: null,
      input: "",
      pending: false,
      pendingAttachments: [],
      uploading: false,
      conversationId: null,
      chatClient: null,
      activeRequestId: null,
    });
  },
  addAttachments: async (files) => {
    const items = Array.from(files || []);
    if (items.length === 0) {
      return;
    }

    set({ uploading: true });

    const attachments = await buildAttachmentsFromFiles(items);

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
    set((state) => {
      const attachment = state.pendingAttachments.find((item) => item.id === id);
      if (attachment?.displayUrl) {
        revokeBlobUrl(attachment.displayUrl);
      }
      return {
        pendingAttachments: state.pendingAttachments.filter(
          (item) => item.id !== id
        ),
      };
    }),
  startEditing: (messageId) => {
    const messages = get().messages;
    const target = messages[messageId - 1];
    if (!target || target.role !== "user") {
      return;
    }

    const existingEditing = get().editingState;
    if (existingEditing?.messageId && existingEditing.messageId !== messageId) {
      // Revoke previews that are not part of the original message blocks.
      const originalIds = collectAttachmentIds(existingEditing.originalBlocks);
      for (const attachment of existingEditing.editedAttachments) {
        if (!originalIds.has(attachment.id)) {
          revokeBlobUrl(attachment.displayUrl);
        }
      }
    }

    const originalBlocks = cloneBlocks(target.blocks ?? []);
    const editedContent = extractContentFromBlocks(originalBlocks);
    const editedAttachments = extractAttachmentsFromBlocks(originalBlocks).map(
      (attachment) => ({ ...attachment })
    );

    set({
      editingState: {
        messageId,
        originalBlocks,
        editedContent,
        editedAttachments,
      },
    });
  },
  updateEditContent: (content) =>
    set((state) => {
      if (!state.editingState) {
        return state;
      }
      return {
        editingState: {
          ...state.editingState,
          editedContent: content,
        },
      };
    }),
  updateEditAttachments: (attachments) =>
    set((state) => {
      if (!state.editingState) {
        return state;
      }

      const originalIds = collectAttachmentIds(state.editingState.originalBlocks);
      const nextIds = new Set(attachments.map((attachment) => attachment.id));

      // Only revoke newly-added previews that are being removed.
      for (const attachment of state.editingState.editedAttachments) {
        if (!nextIds.has(attachment.id) && !originalIds.has(attachment.id)) {
          revokeBlobUrl(attachment.displayUrl);
        }
      }

      return {
        editingState: {
          ...state.editingState,
          editedAttachments: attachments,
        },
      };
    }),
  cancelEditing: () => {
    const editingState = get().editingState;
    if (editingState) {
      const originalIds = collectAttachmentIds(editingState.originalBlocks);
      for (const attachment of editingState.editedAttachments) {
        if (!originalIds.has(attachment.id)) {
          revokeBlobUrl(attachment.displayUrl);
        }
      }
    }
    set({ editingState: null });
  },
  submitEdit: async (depth, navigate) => {
    const editingState = get().editingState;
    if (!editingState) {
      return;
    }

    const selectedModel = get().currentModel;
    if (!selectedModel) {
      toast.warning("请先选择模型");
      return;
    }

    if (get().pending) {
      get().stop();
    }

    const trimmed = editingState.editedContent.trim();
    const attachments = editingState.editedAttachments;
    if (!trimmed && attachments.length === 0) {
      toast.warning("请输入内容或添加附件");
      return;
    }

    const state = get();
    const result = editMessage(
      {
        messages: state.messages,
        currentPath: state.currentPath,
        latestRootId: state.latestRootId,
        nextId: state.nextId,
      },
      depth,
      editingState.messageId,
      buildUserBlocks(editingState.editedContent, attachments)
    );

    if (!result) {
      set({ editingState: null });
      return;
    }

    const nextMessages = result.messages;
    const nextPath = result.currentPath;
    const pathMessages = computeMessagesFromPath(nextMessages, nextPath);

    set({
      messages: nextMessages,
      currentPath: nextPath,
      latestRootId: result.latestRootId,
      nextId: result.nextId,
      editingState: null,
    });

    // Restart the assistant stream from the edited message path.
    await startChatRequest(get, set, {
      messages: pathMessages,
      navigate,
      titleSource: { role: "user", blocks: result.addedMessage.blocks },
    });
  },
  retryFromMessage: async (messageId, depth, navigate) => {
    const state = get();
    const targetNode = state.messages[messageId - 1];
    if (!targetNode) {
      return;
    }

    const selectedModel = get().currentModel;
    if (!selectedModel) {
      toast.warning("请先选择模型");
      return;
    }

    if (get().pending) {
      get().stop();
    }

    if (targetNode.role === "user") {
      const result = editMessage(
        {
          messages: state.messages,
          currentPath: state.currentPath,
          latestRootId: state.latestRootId,
          nextId: state.nextId,
        },
        depth,
        messageId,
        cloneBlocks(targetNode.blocks ?? [])
      );

      if (!result) {
        return;
      }

      const nextMessages = result.messages;
      const nextPath = result.currentPath;
      const pathMessages = computeMessagesFromPath(nextMessages, nextPath);

      set({
        messages: nextMessages,
        currentPath: nextPath,
        latestRootId: result.latestRootId,
        nextId: result.nextId,
        editingState: null,
      });

      await startChatRequest(get, set, {
        messages: pathMessages,
        navigate,
        titleSource: { role: "user", blocks: result.addedMessage.blocks },
      });
      return;
    }

    // For assistant nodes, rewind to the parent user message and regenerate.
    const nextPath = state.currentPath.slice(0, Math.max(depth - 1, 0));
    if (nextPath.length === 0) {
      return;
    }

    const pathMessages = computeMessagesFromPath(state.messages, nextPath);

    set({
      currentPath: nextPath,
      editingState: null,
    });

    const titleSource =
      [...pathMessages].reverse().find((message) => message.role === "user") ??
      pathMessages[0];

    await startChatRequest(get, set, {
      messages: pathMessages,
      navigate,
      titleSource,
    });
  },
  branchToNewConversation: async (messageId, navigate) => {
    const state = get();
    const currentPath = state.currentPath;
    const targetIndex = currentPath.indexOf(messageId);
    if (targetIndex === -1) {
      return;
    }

    if (get().pending) {
      get().stop();
    }

    const pathIds = currentPath.slice(0, targetIndex + 1);
    const pathMessages = pathIds
      .map((id) => state.messages[id - 1])
      .filter((message): message is Message => !!message);

    if (pathMessages.length === 0) {
      return;
    }

    // Copy the path into a new linear conversation to preserve history.
    const linearState = createLinearMessages(
      pathMessages.map((message) => ({
        role: message.role,
        blocks: cloneBlocks(message.blocks ?? []),
        createdAt: message.createdAt,
      }))
    );

    const newConversationId = generateConversationId();
    const now = new Date().toISOString();
    const titleSource =
      pathMessages.find((message) => message.role === "user") ??
      pathMessages[0];
    const title = titleSource
      ? buildConversationTitle(titleSource)
      : "新会话";

    await localDB.save({
      id: newConversationId,
      title,
      currentPath: linearState.currentPath,
      messages: cloneMessages(linearState.messages),
      created_at: now,
      updated_at: now,
    });

    const { addConversation } = useConversationsStore.getState();
    addConversation({
      id: newConversationId,
      title,
      user_id: "",
      created_at: now,
      updated_at: now,
    });

    navigate(`/app/c/${newConversationId}`);
  },
  getBranchInfo: (messageId) => getBranchInfo(get().messages, messageId),
  navigateBranch: (messageId, depth, direction) => {
    if (get().pending) {
      return;
    }

    const state = get();
    const info = getBranchInfo(state.messages, messageId);
    if (!info) {
      return;
    }

    const nextIndex =
      direction === "prev" ? info.currentIndex - 1 : info.currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= info.total) {
      return;
    }

    const targetId = info.siblingIds[nextIndex];
    const nextState = switchBranch(
      {
        messages: state.messages,
        currentPath: state.currentPath,
        latestRootId: state.latestRootId,
        nextId: state.nextId,
      },
      depth,
      targetId
    );

    set({
      messages: nextState.messages,
      currentPath: nextState.currentPath,
      latestRootId: nextState.latestRootId,
      nextId: nextState.nextId,
      editingState: null,
    });
  },
  appendToAssistant: (addition) =>
    set((state) => {
      const currentPath = state.currentPath;
      const lastId = currentPath[currentPath.length - 1] ?? null;
      const lastMessage = lastId ? state.messages[lastId - 1] : null;

      let nextMessages = state.messages;
      let nextPath = state.currentPath;
      let nextLatestRootId = state.latestRootId;
      let nextId = state.nextId;
      let assistantId = lastId;

      if (!lastMessage || lastMessage.role !== "assistant") {
        // Ensure we have a target assistant message to append streaming blocks.
        const result = addMessage(
          {
            messages: state.messages,
            currentPath: state.currentPath,
            latestRootId: state.latestRootId,
            nextId: state.nextId,
          },
          "assistant",
          []
        );
        nextMessages = result.messages;
        nextPath = result.currentPath;
        nextLatestRootId = result.latestRootId;
        nextId = result.nextId;
        assistantId = result.addedMessage.id;
      }

      if (!assistantId || !nextMessages[assistantId - 1]) {
        return state;
      }

      const targetMessage = nextMessages[assistantId - 1];
      const updatedMessage: Message = {
        ...targetMessage,
        blocks: applyAssistantAddition(targetMessage.blocks ?? [], addition),
      };

      const updatedMessages = [...nextMessages];
      updatedMessages[assistantId - 1] = updatedMessage;

      return {
        messages: updatedMessages,
        currentPath: nextPath,
        latestRootId: nextLatestRootId,
        nextId,
      };
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
    const attachments = get().pendingAttachments;
    const trimmed = input.trim();
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

    const state = get();
    const result = addMessage(
      {
        messages: state.messages,
        currentPath: state.currentPath,
        latestRootId: state.latestRootId,
        nextId: state.nextId,
      },
      "user",
      buildUserBlocks(input, attachments)
    );

    const nextMessages = result.messages;
    const nextPath = result.currentPath;
    const pathMessages = computeMessagesFromPath(nextMessages, nextPath);

    set({
      messages: nextMessages,
      currentPath: nextPath,
      latestRootId: result.latestRootId,
      nextId: result.nextId,
      input: "",
      pendingAttachments: [],
    });

    await startChatRequest(get, set, {
      messages: pathMessages,
      navigate,
      titleSource: { role: "user", blocks: result.addedMessage.blocks },
    });
  },
}));

export const useIsNewChat = () =>
  useChatStore(
    (state) => state.conversationId === null && state.messages.length === 0
  );
