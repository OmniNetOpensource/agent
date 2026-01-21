import {
  Attachment,
  EditingState,
  Message,
  MessageNode,
  MessageTree,
  BranchInfo,
} from "@/src/features/chat/types/chat";
import { revokeBlobUrl } from "@/src/shared/utils/file";
import { create } from "zustand";
import { ChatClient } from "@/src/features/chat/lib/chat-client";
import { toast } from "@/src/shared/toast";
import { localDB } from "@/src/shared/lib/indexed-db";
import { buildConversationTitle } from "@/src/shared/utils/chatFormat";
import {
  computeMessagesFromPath,
  generateMessageId,
  getBranchInfo,
  migrateMessagesToTree,
  createEmptyMessageTree,
  insertNode,
  followFirstChildPath,
  ensureTreePath,
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
  messageTree: MessageTree;
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
  startEditing: (messageId: string) => void;
  updateEditContent: (content: string) => void;
  updateEditAttachments: (attachments: Attachment[]) => void;
  cancelEditing: () => void;
  submitEdit: (navigate?: (path: string) => void) => Promise<void>;
  retryFromMessage: (
    messageId: string,
    navigate?: (path: string) => void
  ) => Promise<void>;
  branchToNewConversation: (
    messageId: string,
    navigate: (path: string) => void
  ) => Promise<void>;
  getBranchInfo: (messageId: string) => BranchInfo | null;
  navigateBranch: (messageId: string, direction: "prev" | "next") => void;
  initializeTree: (messages?: Message[], tree?: MessageTree | null) => void;
  getMessagesFromPath: () => Message[];
  stop: () => void;
  setCurrentModel: (model: string) => void;
  setSearchEnabled: (enabled: boolean) => void;
  setSystemInstruction: (instruction: string) => void;
};

const generateConversationId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  messages: [],
  messageTree: createEmptyMessageTree(),
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
    const existingTree = get().messageTree;
    if (Object.keys(existingTree.nodes).length > 0) {
      revokeTreeAttachments(existingTree);
    }
    const tree = migrateMessagesToTree(messages);
    set({
      messageTree: tree,
      messages: computeMessagesFromPath(tree),
      editingState: null,
    });
  },
  initializeTree: (messages = [], tree) => {
    const existingTree = get().messageTree;
    if (Object.keys(existingTree.nodes).length > 0) {
      revokeTreeAttachments(existingTree);
    }
    const nextTree =
      tree && Object.keys(tree.nodes ?? {}).length > 0
        ? ensureTreePath(tree)
        : migrateMessagesToTree(messages);
    set({
      messageTree: nextTree,
      messages: computeMessagesFromPath(nextTree),
      editingState: null,
    });
  },
  getMessagesFromPath: () => computeMessagesFromPath(get().messageTree),
  setConversationId: (id) => set({ conversationId: id }),
  setSearchEnabled: (enabled) => set({ searchEnabled: enabled }),
  setSystemInstruction: (instruction) =>
    set({ systemInstruction: instruction }),
  clear: () => {
    const client = get().chatClient;
    if (client) {
      client.abort();
    }
    revokeTreeAttachments(get().messageTree);
    revokeAttachments(get().pendingAttachments);
    const editingState = get().editingState;
    if (editingState) {
      revokeAttachments(editingState.editedAttachments);
    }
    set({
      messages: [],
      messageTree: createEmptyMessageTree(),
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
    const tree = get().messageTree;
    const target = tree.nodes[messageId];
    if (!target || target.role !== "user") {
      return;
    }

    const existingEditing = get().editingState;
    if (existingEditing?.messageId && existingEditing.messageId !== messageId) {
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
  submitEdit: async (navigate) => {
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

    const tree = get().messageTree;
    const targetNode = tree.nodes[editingState.messageId];
    if (!targetNode) {
      set({ editingState: null });
      return;
    }

    const parentId = targetNode.parentId ?? null;
    const newNode: MessageNode = {
      id: generateMessageId(),
      role: "user",
      blocks: buildUserBlocks(editingState.editedContent, attachments),
      parentId,
      children: [],
      createdAt: new Date().toISOString(),
    };

    let nextTree = insertNode(tree, newNode, parentId);
    const currentPath = tree.currentPath;
    const targetIndex = currentPath.indexOf(editingState.messageId);
    if (targetIndex === -1) {
      set({ editingState: null });
      return;
    }
    const prefix = targetIndex > 0 ? currentPath.slice(0, targetIndex) : [];
    nextTree = {
      ...nextTree,
      currentPath: [...prefix, newNode.id],
    };

    const nextMessages = computeMessagesFromPath(nextTree);

    set({
      messageTree: nextTree,
      messages: nextMessages,
      editingState: null,
    });

    await startChatRequest(get, set, {
      messages: nextMessages,
      navigate,
      titleSource: { role: "user", blocks: newNode.blocks },
    });
  },
  retryFromMessage: async (messageId, navigate) => {
    const tree = get().messageTree;
    const targetNode = tree.nodes[messageId];
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

    const currentPath = tree.currentPath;
    const targetIndex = currentPath.indexOf(messageId);
    if (targetIndex === -1) {
      return;
    }

    // 用户消息重试：复制创建新的用户消息分支
    if (targetNode.role === "user") {
      const parentId = targetNode.parentId ?? null;
      const newNode: MessageNode = {
        id: generateMessageId(),
        role: "user",
        blocks: cloneBlocks(targetNode.blocks ?? []),
        parentId,
        children: [],
        createdAt: new Date().toISOString(),
      };

      let nextTree = insertNode(tree, newNode, parentId);
      const prefix = targetIndex > 0 ? currentPath.slice(0, targetIndex) : [];
      nextTree = {
        ...nextTree,
        currentPath: [...prefix, newNode.id],
      };

      const nextMessages = computeMessagesFromPath(nextTree);

      set({
        messageTree: nextTree,
        messages: nextMessages,
        editingState: null,
      });

      await startChatRequest(get, set, {
        messages: nextMessages,
        navigate,
        titleSource: { role: "user", blocks: newNode.blocks },
      });
      return;
    }

    // 助手消息重试：重新生成回复
    const baseIndex = targetIndex - 1;
    if (baseIndex < 0) {
      return;
    }

    const nextPath = currentPath.slice(0, baseIndex + 1);
    const nextTree: MessageTree = { ...tree, currentPath: nextPath };
    const nextMessages = computeMessagesFromPath(nextTree);

    set({
      messageTree: nextTree,
      messages: nextMessages,
      editingState: null,
    });

    const titleSource =
      [...nextMessages].reverse().find((message) => message.role === "user") ??
      nextMessages[0];

    await startChatRequest(get, set, {
      messages: nextMessages,
      navigate,
      titleSource,
    });
  },
  branchToNewConversation: async (messageId, navigate) => {
    const tree = get().messageTree;
    const currentPath = tree.currentPath;
    const targetIndex = currentPath.indexOf(messageId);
    if (targetIndex === -1) {
      return;
    }

    if (get().pending) {
      get().stop();
    }

    const pathIds = currentPath.slice(0, targetIndex + 1);
    const branchedMessages = pathIds
      .map((id) => tree.nodes[id])
      .filter((node): node is MessageNode => !!node)
      .map((node) => ({
        role: node.role,
        blocks: cloneBlocks(node.blocks ?? []),
      }));

    if (branchedMessages.length === 0) {
      return;
    }

    const newConversationId = generateConversationId();
    const now = new Date().toISOString();
    const titleSource =
      branchedMessages.find((message) => message.role === "user") ??
      branchedMessages[0];
    const title = titleSource
      ? buildConversationTitle(titleSource)
      : "新会话";

    const branchedTree = migrateMessagesToTree(branchedMessages);

    await localDB.save({
      id: newConversationId,
      title,
      messageTree: branchedTree,
      messages: cloneMessages(branchedMessages),
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
  getBranchInfo: (messageId) => getBranchInfo(get().messageTree, messageId),
  navigateBranch: (messageId, direction) => {
    if (get().pending) {
      return;
    }

    const tree = get().messageTree;
    const info = getBranchInfo(tree, messageId);
    if (!info) {
      return;
    }

    const currentPath = tree.currentPath;
    const messageIndex = currentPath.indexOf(messageId);
    if (messageIndex === -1) {
      return;
    }

    const nextIndex =
      direction === "prev" ? info.currentIndex - 1 : info.currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= info.total) {
      return;
    }

    const targetId = info.siblingIds[nextIndex];
    const prefix = messageIndex > 0 ? currentPath.slice(0, messageIndex) : [];
    const branchPath = followFirstChildPath(tree, targetId);

    const nextTree: MessageTree = {
      ...tree,
      currentPath: [...prefix, ...branchPath],
    };

    set({
      messageTree: nextTree,
      messages: computeMessagesFromPath(nextTree),
      editingState: null,
    });
  },
  appendToAssistant: (addition) =>
    set((state) => {
      const tree = state.messageTree;
      const currentPath = tree.currentPath;
      const lastId = currentPath[currentPath.length - 1];
      const lastNode = lastId ? tree.nodes[lastId] : null;

      let nextTree = tree;
      let nextPath = [...currentPath];
      let assistantId = lastId;

      if (!lastNode || lastNode.role !== "assistant") {
        const parentId = lastId ?? null;
        const newNode: MessageNode = {
          id: generateMessageId(),
          role: "assistant",
          blocks: [],
          parentId,
          children: [],
          createdAt: new Date().toISOString(),
        };
        nextTree = insertNode(tree, newNode, parentId);
        assistantId = newNode.id;
        nextPath = [...nextPath, assistantId];
      }

      if (!assistantId || !nextTree.nodes[assistantId]) {
        return state;
      }

      const targetNode = nextTree.nodes[assistantId];
      const updatedNode: MessageNode = {
        ...targetNode,
        blocks: applyAssistantAddition(targetNode.blocks ?? [], addition),
      };

      const finalTree: MessageTree = {
        ...nextTree,
        nodes: {
          ...nextTree.nodes,
          [assistantId]: updatedNode,
        },
        currentPath: nextPath,
      };

      return {
        messageTree: finalTree,
        messages: computeMessagesFromPath(finalTree),
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

    const tree = get().messageTree;
    const parentId = tree.currentPath[tree.currentPath.length - 1] ?? null;
    const userNode: MessageNode = {
      id: generateMessageId(),
      role: "user",
      blocks: buildUserBlocks(input, attachments),
      parentId,
      children: [],
      createdAt: new Date().toISOString(),
    };

    let nextTree = insertNode(tree, userNode, parentId);
    nextTree = {
      ...nextTree,
      currentPath: [...tree.currentPath, userNode.id],
    };

    const nextMessages = computeMessagesFromPath(nextTree);

    set({
      messageTree: nextTree,
      messages: nextMessages,
      input: "",
      pendingAttachments: [],
    });

    await startChatRequest(get, set, {
      messages: nextMessages,
      navigate,
      titleSource: { role: "user", blocks: userNode.blocks },
    });
  },
}));

export const useIsNewChat = () =>
  useChatStore(
    (state) => state.conversationId === null && state.messages.length === 0
  );
