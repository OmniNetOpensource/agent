import { create } from "zustand";
import type { Attachment, EditingState } from "@/src/features/chat/types/chat";
import { toast } from "@/src/shared/toast";
import { revokeBlobUrl } from "@/src/shared/utils/file";
import {
  buildUserBlocks,
  cloneBlocks,
  collectAttachmentIds,
  computeMessagesFromPath,
  editMessage,
  extractAttachmentsFromBlocks,
  extractContentFromBlocks,
} from "@/src/features/chat/lib/tree";
import { startChatRequest } from "@/src/features/chat/lib/network";
import { cleanupEditingAttachments } from "@/src/features/chat/lib/attachments/cleanup";
import { useMessageTreeStore } from "./useMessageTreeStore";
import { getChatRequestHandlers, useChatRequestStore } from "./useChatRequestStore";

type EditingStoreState = {
  editingState: EditingState | null;
  currentModel: string;
};

type EditingStoreActions = {
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
  setCurrentModel: (model: string) => void;
  clear: () => void;
};

export const useEditingStore = create<EditingStoreState & EditingStoreActions>(
  (set, get) => ({
    editingState: null,
    currentModel: "",
    startEditing: (messageId) => {
      const messages = useMessageTreeStore.getState().messages;
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
      cleanupEditingAttachments(get().editingState);
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

      const requestStore = useChatRequestStore.getState();
      if (requestStore.pending) {
        requestStore.stop();
      }

      const trimmed = editingState.editedContent.trim();
      const attachments = editingState.editedAttachments;
      if (!trimmed && attachments.length === 0) {
        toast.warning("请输入内容或添加附件");
        return;
      }

      const treeStore = useMessageTreeStore.getState();
      const result = editMessage(
        treeStore._getTreeState(),
        depth,
        editingState.messageId,
        buildUserBlocks(editingState.editedContent, attachments)
      );

      if (!result) {
        set({ editingState: null });
        return;
      }

      treeStore._setTreeState({
        messages: result.messages,
        currentPath: result.currentPath,
        latestRootId: result.latestRootId,
        nextId: result.nextId,
      });
      set({ editingState: null });

      const pathMessages = computeMessagesFromPath(
        result.messages,
        result.currentPath
      );

      const { get: getRequestState, set: setRequestState } =
        getChatRequestHandlers();

      await startChatRequest(getRequestState, setRequestState, {
        messages: pathMessages,
        navigate,
        titleSource: { role: "user", blocks: result.addedMessage.blocks },
      });
    },
    retryFromMessage: async (messageId, depth, navigate) => {
      const treeStore = useMessageTreeStore.getState();
      const treeState = treeStore._getTreeState();
      const targetNode = treeState.messages[messageId - 1];
      if (!targetNode) {
        return;
      }

      const selectedModel = get().currentModel;
      if (!selectedModel) {
        toast.warning("请先选择模型");
        return;
      }

      const requestStore = useChatRequestStore.getState();
      if (requestStore.pending) {
        requestStore.stop();
      }

      if (targetNode.role === "user") {
        const result = editMessage(
          treeState,
          depth,
          messageId,
          cloneBlocks(targetNode.blocks ?? [])
        );

        if (!result) {
          return;
        }

        treeStore._setTreeState({
          messages: result.messages,
          currentPath: result.currentPath,
          latestRootId: result.latestRootId,
          nextId: result.nextId,
        });
        set({ editingState: null });

        const pathMessages = computeMessagesFromPath(
          result.messages,
          result.currentPath
        );

        const { get: getRequestState, set: setRequestState } =
          getChatRequestHandlers();

        await startChatRequest(getRequestState, setRequestState, {
          messages: pathMessages,
          navigate,
          titleSource: { role: "user", blocks: result.addedMessage.blocks },
        });
        return;
      }

      // For assistant nodes, rewind to the parent user message and regenerate.
      const nextPath = treeState.currentPath.slice(0, Math.max(depth - 1, 0));
      if (nextPath.length === 0) {
        return;
      }

      treeStore._setTreeState({ currentPath: nextPath });
      set({ editingState: null });

      const pathMessages = computeMessagesFromPath(treeState.messages, nextPath);
      const titleSource =
        [...pathMessages].reverse().find((message) => message.role === "user") ??
        pathMessages[0];

      const { get: getRequestState, set: setRequestState } =
        getChatRequestHandlers();

      await startChatRequest(getRequestState, setRequestState, {
        messages: pathMessages,
        navigate,
        titleSource,
      });
    },
    setCurrentModel: (model) => set({ currentModel: model }),
    clear: () => {
      cleanupEditingAttachments(get().editingState);
      set({ editingState: null });
    },
  })
);
