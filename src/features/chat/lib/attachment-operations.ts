import type { Attachment, Message } from "@/src/features/chat/types/chat";
import {
  MAX_ATTACHMENT_SIZE,
  createBlobUrl,
  detectAttachmentKind,
  revokeBlobUrl,
} from "@/src/shared/utils/file";
import { toast } from "@/src/shared/toast";

export const revokeAttachments = (attachments: Attachment[]) => {
  for (const attachment of attachments) {
    if (attachment.displayUrl) {
      revokeBlobUrl(attachment.displayUrl);
    }
  }
};

export const revokeTreeAttachments = (messages: Message[]) => {
  for (const message of messages) {
    for (const block of message.blocks) {
      if (block.type === "attachments") {
        revokeAttachments(block.attachments);
      }
    }
  }
};

export const buildAttachmentsFromFiles = async (
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
