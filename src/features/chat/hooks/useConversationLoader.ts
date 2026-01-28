import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useEditingStore,
  useMessageTreeStore,
} from "@/src/features/chat/store";
import { usePreviewStore } from "@/src/features/preview/store/usePreviewStore";
import { localDB } from "@/src/shared/lib/indexed-db";
import {
  buildCurrentPath,
  createLinearMessages,
} from "@/src/features/chat/lib/tree";
import type {
  Attachment,
  LegacyAttachment,
  Message,
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

type RawMessage = Message | { role?: unknown; blocks?: unknown; createdAt?: unknown };

const isStructuredMessage = (msg: RawMessage): msg is Message =>
  typeof (msg as Message).id === "number";

const hydrateMessage = (msg: Message): Message => ({
  id: msg.id,
  role: msg.role,
  blocks: hydrateBlocks(msg.blocks),
  prevSibling: msg.prevSibling ?? null,
  nextSibling: msg.nextSibling ?? null,
  latestChild: msg.latestChild ?? null,
  createdAt: msg.createdAt ?? new Date().toISOString(),
});

const toLinearInput = (msg: RawMessage) => {
  const role = msg.role;
  if (role !== "user" && role !== "assistant") {
    return null;
  }
  const normalizedRole = role as "user" | "assistant";
  const blocks = hydrateBlocks(
    Array.isArray(msg.blocks) ? (msg.blocks as Message["blocks"]) : []
  );
  const createdAt =
    typeof msg.createdAt === "string" ? msg.createdAt : undefined;
  return { role: normalizedRole, blocks, createdAt };
};

type LinearInput = NonNullable<ReturnType<typeof toLinearInput>>;

export function useConversationLoader(conversationId: string | undefined) {
  const router = useRouter();
  const currentConversationId = useMessageTreeStore(
    (state) => state.conversationId
  );
  const initializeTree = useMessageTreeStore((state) => state.initializeTree);
  const setConversationId = useMessageTreeStore((state) => state.setConversationId);

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

        const rawMessages: RawMessage[] = Array.isArray(conversation.messages)
          ? (conversation.messages as RawMessage[])
          : [];
        const rawCurrentPath = (conversation as { currentPath?: unknown })
          .currentPath;
        let currentPath =
          Array.isArray(rawCurrentPath) &&
          rawCurrentPath.every((id) => typeof id === "number")
            ? rawCurrentPath
            : [];
        let mappedMessages: Message[] = [];

        if (rawMessages.length > 0) {
          if (rawMessages.every(isStructuredMessage)) {
            mappedMessages = rawMessages.map((msg) => hydrateMessage(msg));
          } else {
            const linearInputs = rawMessages
              .map(toLinearInput)
              .filter((item): item is LinearInput => !!item);
            const linearState = createLinearMessages(linearInputs);
            mappedMessages = linearState.messages;
            currentPath = linearState.currentPath;
          }
        }

        if (currentPath.length === 0 && mappedMessages.length > 0) {
          const rawLatestRootId = (conversation as { latestRootId?: unknown })
            .latestRootId;
          const latestRootId =
            typeof rawLatestRootId === "number"
              ? rawLatestRootId
              : mappedMessages[0].id;
          currentPath = buildCurrentPath(mappedMessages, latestRootId);
        }

        if (canceled || signal.aborted) {
          return;
        }

        usePreviewStore.getState().reset();
        useEditingStore.getState().clear();
        setConversationId(conversationId);
        initializeTree(mappedMessages, currentPath);
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
