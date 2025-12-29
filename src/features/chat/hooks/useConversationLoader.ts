import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { localDB } from "@/src/shared/lib/indexed-db";
import { migrateMessagesToTree } from "@/src/features/chat/lib/message-tree";
import type {
  Attachment,
  LegacyAttachment,
  Message,
  MessageNode,
  MessageTree,
} from "@/src/features/chat/types/chat";
import { base64ToBlob, createBlobUrl } from "@/src/shared/utils/file";

const buildAttachment = (
  att: Attachment | LegacyAttachment,
  blob: Blob
): Attachment => ({
  id: att.id,
  kind: att.kind,
  name: att.name,
  size: att.size,
  mimeType: att.mimeType,
  blob,
  displayUrl: createBlobUrl(blob),
});

const restoreDisplayUrls = (
  attachments: Array<Attachment | LegacyAttachment>
): Attachment[] =>
  attachments.map((att) => {
    if ("blob" in att && att.blob instanceof Blob) {
      return buildAttachment(att, att.blob);
    }

    if (
      "url" in att &&
      typeof att.url === "string" &&
      att.url.startsWith("data:")
    ) {
      const blob = base64ToBlob(att.url);
      return buildAttachment(att, blob);
    }

    return att as Attachment;
  });

const hydrateBlocks = (blocks: Message["blocks"]) =>
  Array.isArray(blocks)
    ? blocks.map((block) =>
        block.type === "research"
          ? {
              ...block,
              items: block.items.map((item) => ({ ...item })),
            }
          : block.type === "attachments"
          ? {
              ...block,
              attachments: restoreDisplayUrls(
                Array.isArray(block.attachments) ? block.attachments : []
              ),
            }
          : { ...block }
      )
    : [];

const hydrateMessage = (msg: Message): Message => ({
  role: msg.role,
  blocks: hydrateBlocks(msg.blocks),
});

const hydrateTree = (tree: MessageTree): MessageTree => {
  const nodes: Record<string, MessageNode> = {};

  for (const [id, node] of Object.entries(tree.nodes ?? {})) {
    nodes[id] = {
      ...node,
      blocks: hydrateBlocks(node.blocks ?? []),
      children: Array.isArray(node.children) ? [...node.children] : [],
    };
  }

  return {
    ...tree,
    nodes,
    rootIds: Array.isArray(tree.rootIds) ? [...tree.rootIds] : [],
    currentPath: Array.isArray(tree.currentPath) ? [...tree.currentPath] : [],
  };
};

export function useConversationLoader(conversationId: string | undefined) {
  const router = useRouter();
  const currentConversationId = useChatStore((state) => state.conversationId);
  const initializeTree = useChatStore((state) => state.initializeTree);
  const setConversationId = useChatStore((state) => state.setConversationId);

  useEffect(() => {
    if (!conversationId || currentConversationId === conversationId) {
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;
    let canceled = false;

    const load = async () => {
      try {
        const conversation = await localDB.get(conversationId);
        if (canceled || signal.aborted) {
          return;
        }

        if (!conversation) {
          router.replace("/404");
          return;
        }

        const mappedMessages = (conversation.messages ?? []).map((msg) =>
          hydrateMessage(msg)
        );
        let mappedTree = conversation.messageTree
          ? hydrateTree(conversation.messageTree)
          : null;

        if (!mappedTree || Object.keys(mappedTree.nodes ?? {}).length === 0) {
          mappedTree = migrateMessagesToTree(mappedMessages);
          if (mappedMessages.length > 0) {
            const updated_at = conversation.updated_at ?? new Date().toISOString();
            await localDB.save({
              ...conversation,
              messageTree: mappedTree,
              messages: mappedMessages,
              updated_at,
            });
          }
        }

        if (canceled || signal.aborted) {
          return;
        }

        setConversationId(conversationId);
        initializeTree(mappedMessages, mappedTree);
      } catch (error) {
        if (canceled || signal.aborted) {
          return;
        }
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Failed to load conversation:", error);
        router.replace("/404");
      }
    };

    void load();

    return () => {
      canceled = true;
      abortController.abort();
    };
  }, [
    conversationId,
    currentConversationId,
    router,
    setConversationId,
    initializeTree,
  ]);

  return { isLoading: conversationId !== currentConversationId };
}
