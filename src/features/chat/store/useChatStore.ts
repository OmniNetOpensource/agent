import {
  Attachment,
  ContentBlock,
  EditingState,
  MessageNode,
  MessageTree,
  Message,
  ResearchItem,
  SerializedAttachment,
  SerializedContentBlock,
  SerializedMessage,
  ToolProgress,
  BranchInfo,
} from "@/src/features/chat/types/chat";
import {
  MAX_ATTACHMENT_SIZE,
  convertBlobToBase64,
  createBlobUrl,
  detectAttachmentKind,
  revokeBlobUrl,
} from "@/src/shared/utils/file";
import { create } from "zustand";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";
import { ChatClient } from "@/src/features/chat/lib/chat-client";
import { toast } from "@/src/shared/toast";
import { localDB } from "@/src/shared/lib/indexed-db";
import { buildConversationTitle } from "@/src/shared/utils/chatFormat";
import {
  computeMessagesFromPath,
  generateMessageId,
  getBranchInfo,
  migrateMessagesToTree,
} from "@/src/features/chat/lib/message-tree";

export type ChatState = {
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

const generateLocalMessageId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const generateConversationId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const createEmptyMessageTree = (): MessageTree => ({
  nodes: {},
  rootIds: [],
  currentPath: [],
});

const revokeAttachments = (attachments: Attachment[]) => {
  for (const attachment of attachments) {
    if (attachment.displayUrl) {
      revokeBlobUrl(attachment.displayUrl);
    }
  }
};

const cloneResearchItem = (item: ResearchItem): ResearchItem => {
  if (item.kind === "thinking") {
    return { ...item };
  }

  return {
    kind: "tool",
    data: {
      call: {
        tool: item.data.call.tool,
        args: { ...item.data.call.args },
      },
      progress: item.data.progress
        ? item.data.progress.map((entry) => ({ ...entry }))
        : undefined,
      result: item.data.result ? { ...item.data.result } : undefined,
    },
  };
};

const cloneBlocks = (blocks: ContentBlock[]): ContentBlock[] =>
  blocks.map((block) => {
    if (block.type === "research") {
      return {
        ...block,
        items: block.items.map((item) => cloneResearchItem(item)),
      };
    }
    if (block.type === "attachments") {
      return {
        ...block,
        attachments: block.attachments.map((attachment) => ({
          ...attachment,
        })),
      };
    }
    return { ...block };
  });

const cloneMessages = (messages: Message[]) =>
  messages.map((msg) => ({
    role: msg.role,
    blocks: cloneBlocks(Array.isArray(msg.blocks) ? msg.blocks : []),
  }));

const extractContentFromBlocks = (blocks: ContentBlock[]) =>
  blocks
    .filter((block) => block.type === "content")
    .map((block) => block.content)
    .join("\n\n");

const extractAttachmentsFromBlocks = (blocks: ContentBlock[]) =>
  blocks.flatMap((block) =>
    block.type === "attachments" ? block.attachments : []
  );

const collectAttachmentIds = (blocks: ContentBlock[]) =>
  new Set(
    blocks.flatMap((block) =>
      block.type === "attachments"
        ? block.attachments.map((attachment) => attachment.id)
        : []
    )
  );

const revokeTreeAttachments = (tree: MessageTree) => {
  for (const node of Object.values(tree.nodes)) {
    for (const block of node.blocks) {
      if (block.type === "attachments") {
        revokeAttachments(block.attachments);
      }
    }
  }
};

const buildAttachmentsFromFiles = async (
  files: File[]
): Promise<Attachment[]> => {
  const items = Array.from(files || []);
  if (items.length === 0) {
    return [];
  }

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
      const blob = file;
      const displayUrl = createBlobUrl(blob);
      attachments.push({
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: detectAttachmentKind(mimeType),
        name: file.name,
        size: file.size,
        mimeType,
        blob,
        displayUrl,
      });
    } catch (error) {
      console.error(`无法上传文件「${file.name}」`, error);
      toast.error(`无法上传文件「${file.name}」，请稍后重试。`);
    }
  }

  return attachments;
};

const applyAssistantAddition = (
  blocks: ContentBlock[],
  addition: AssistantAddition
): ContentBlock[] => {
  const nextBlocks = cloneBlocks(blocks ?? []);

  const ensureResearchBlock = (targetBlocks: ContentBlock[]) => {
    const lastBlock = targetBlocks[targetBlocks.length - 1];
    if (!lastBlock || lastBlock.type !== "research") {
      targetBlocks.push({ type: "research", items: [] });
      return targetBlocks.length - 1;
    }
    return targetBlocks.length - 1;
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
      const researchIndex = ensureResearchBlock(nextBlocks);
      const researchBlock = nextBlocks[researchIndex] as Extract<
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

      nextBlocks[researchIndex] = { ...researchBlock, items };
      return nextBlocks;
    }

    if (addition.kind === "tool") {
      const researchIndex = ensureResearchBlock(nextBlocks);
      const researchBlock = nextBlocks[researchIndex] as Extract<
        ContentBlock,
        { type: "research" }
      >;

      nextBlocks[researchIndex] = {
        ...researchBlock,
        items: [...researchBlock.items, { ...addition }],
      };
      return nextBlocks;
    }

    if (addition.kind === "tool_progress") {
      const researchIndex = ensureResearchBlock(nextBlocks);
      const researchBlock = nextBlocks[researchIndex] as Extract<
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

      nextBlocks[researchIndex] = { ...researchBlock, items };
      return nextBlocks;
    }

    if (addition.kind === "tool_result") {
      const researchIndex = ensureResearchBlock(nextBlocks);
      const researchBlock = nextBlocks[researchIndex] as Extract<
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

      nextBlocks[researchIndex] = { ...researchBlock, items };
      return nextBlocks;
    }
  }

  if ("type" in addition) {
    if (addition.type === "research") {
      const normalizedItems = addition.items.map((item) =>
        item.kind === "thinking" ? { ...item } : cloneResearchItem(item)
      );
      nextBlocks.push({ type: "research", items: normalizedItems });
      return nextBlocks;
    }

    if (addition.type === "error") {
      nextBlocks.push({ type: "error", message: addition.message });
      return nextBlocks;
    }

    if (addition.type === "content") {
      const additionText = addition.content;
      if (!additionText) {
        return nextBlocks;
      }

      const lastBlock = nextBlocks[nextBlocks.length - 1];
      if (lastBlock?.type === "content") {
        nextBlocks[nextBlocks.length - 1] = {
          ...lastBlock,
          content: lastBlock.content + additionText,
        };
      } else {
        nextBlocks.push({ type: "content", content: additionText });
      }
      return nextBlocks;
    }
  }

  return nextBlocks;
};

const buildUserBlocks = (
  content: string,
  attachments: Attachment[]
): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  const trimmed = content.trim();
  if (trimmed) {
    blocks.push({ type: "content", content: trimmed });
  }
  if (attachments.length > 0) {
    blocks.push({ type: "attachments", attachments });
  }
  return blocks;
};

const insertNode = (
  tree: MessageTree,
  node: MessageNode,
  parentId: string | null
): MessageTree => {
  const nextNodes = { ...tree.nodes, [node.id]: node };
  let nextRootIds = tree.rootIds;

  if (parentId) {
    const parent = tree.nodes[parentId];
    if (parent) {
      nextNodes[parentId] = {
        ...parent,
        children: [...parent.children, node.id],
      };
    }
  } else {
    nextRootIds = [...tree.rootIds, node.id];
  }

  return {
    ...tree,
    nodes: nextNodes,
    rootIds: nextRootIds,
  };
};

const followFirstChildPath = (tree: MessageTree, startId: string) => {
  const path: string[] = [];
  let currentId: string | undefined = startId;

  while (currentId) {
    path.push(currentId);
    const node = tree.nodes[currentId];
    const nextId = node?.children?.[0];
    currentId = nextId;
  }

  return path;
};

const ensureTreePath = (tree: MessageTree): MessageTree => {
  if (tree.currentPath.length > 0) {
    return tree;
  }
  const firstRoot = tree.rootIds[0];
  if (!firstRoot) {
    return tree;
  }
  return {
    ...tree,
    currentPath: followFirstChildPath(tree, firstRoot),
  };
};

const serializeAttachments = async (
  attachments: Attachment[]
): Promise<SerializedAttachment[]> => {
  const serialized: SerializedAttachment[] = [];

  for (const attachment of attachments) {
    const url = await convertBlobToBase64(attachment.blob);
    serialized.push({
      id: attachment.id,
      kind: attachment.kind,
      name: attachment.name,
      size: attachment.size,
      mimeType: attachment.mimeType,
      url,
    });
  }

  return serialized;
};

const serializeBlocks = async (
  blocks: ContentBlock[]
): Promise<SerializedContentBlock[]> =>
  Promise.all(
    blocks.map(async (block) => {
      if (block.type === "attachments") {
        return {
          ...block,
          attachments: await serializeAttachments(block.attachments),
        };
      }
      return { ...block };
    })
  );

const serializeMessagesForRequest = async (
  messages: Message[]
): Promise<SerializedMessage[]> =>
  Promise.all(
    messages.map(async (message) => ({
      role: message.role,
      blocks: await serializeBlocks(message.blocks),
    }))
  );

type StoreGetter = () => ChatState & ChatActions;
type StoreSetter = (
  partial:
    | Partial<ChatState & ChatActions>
    | ((state: ChatState & ChatActions) => Partial<ChatState & ChatActions>),
  replace?: boolean
) => void;

type StartRequestOptions = {
  messages: Message[];
  navigate?: (path: string) => void;
  titleSource?: Message;
  preferLocalTitle?: boolean;
};

const startChatRequest = async (
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
      titleSource?: Message;
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
            ...state,
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

    const baseIndex =
      targetNode.role === "assistant" ? targetIndex - 1 : targetIndex;
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
      preferLocalTitle: tree.currentPath.length === 0,
    });
  },
}));

export const useIsNewChat = () =>
  useChatStore(
    (state) => state.conversationId === null && state.messages.length === 0
  );
