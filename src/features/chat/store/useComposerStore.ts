import { create } from "zustand";
import type { Attachment } from "@/src/features/chat/types/chat";
import { buildAttachmentsFromFiles } from "@/src/features/chat/lib/attachments";
import { cleanupPendingAttachments } from "@/src/features/chat/lib/attachments/cleanup";
import { revokeBlobUrl } from "@/src/shared/utils/file";

type ComposerState = {
  input: string;
  pendingAttachments: Attachment[];
  uploading: boolean;
};

type ComposerActions = {
  setInput: (value: string) => void;
  addAttachments: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearInput: () => void;
  clearAttachments: () => void;
  clear: () => void;
};

export const useComposerStore = create<ComposerState & ComposerActions>(
  (set, get) => ({
    input: "",
    pendingAttachments: [],
    uploading: false,
    setInput: (value) => set({ input: value }),
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
    clearInput: () => set({ input: "" }),
    clearAttachments: () => {
      cleanupPendingAttachments(get().pendingAttachments);
      set({ pendingAttachments: [] });
    },
    clear: () => {
      cleanupPendingAttachments(get().pendingAttachments);
      set({
        input: "",
        pendingAttachments: [],
        uploading: false,
      });
    },
  })
);
