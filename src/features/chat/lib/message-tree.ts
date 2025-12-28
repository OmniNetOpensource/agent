import type {
  BranchInfo,
  ContentBlock,
  Message,
  MessageNode,
  MessageTree,
  ResearchItem,
} from "@/src/features/chat/types/chat";

export const generateMessageId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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
        attachments: block.attachments.map((attachment) => ({ ...attachment })),
      };
    }
    return { ...block };
  });

export const migrateMessagesToTree = (messages: Message[]): MessageTree => {
  const tree: MessageTree = { nodes: {}, rootIds: [], currentPath: [] };

  if (messages.length === 0) {
    return tree;
  }

  let parentId: string | null = null;

  for (const message of messages) {
    const id = generateMessageId();
    const node: MessageNode = {
      id,
      role: message.role,
      blocks: cloneBlocks(message.blocks ?? []),
      parentId,
      children: [],
      createdAt: new Date().toISOString(),
    };

    tree.nodes[id] = node;

    if (parentId) {
      const parent = tree.nodes[parentId];
      if (parent) {
        parent.children = [...parent.children, id];
      }
    } else {
      tree.rootIds = [...tree.rootIds, id];
    }

    tree.currentPath = [...tree.currentPath, id];
    parentId = id;
  }

  return tree;
};

export const computeMessagesFromPath = (tree: MessageTree): Message[] =>
  tree.currentPath
    .map((id) => tree.nodes[id])
    .filter((node): node is MessageNode => !!node)
    .map((node) => ({
      role: node.role,
      blocks: cloneBlocks(node.blocks ?? []),
    }));

export const getBranchInfo = (
  tree: MessageTree,
  messageId: string
): BranchInfo | null => {
  const node = tree.nodes[messageId];
  if (!node) {
    return null;
  }

  const siblingIds = node.parentId
    ? tree.nodes[node.parentId]?.children ?? []
    : tree.rootIds;

  if (siblingIds.length <= 1) {
    return null;
  }

  const currentIndex = siblingIds.indexOf(messageId);
  if (currentIndex === -1) {
    return null;
  }

  return {
    currentIndex,
    total: siblingIds.length,
    siblingIds,
  };
};
