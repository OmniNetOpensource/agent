import { Attachment } from "@/src/features/chat/types/chat";

export const MAX_ATTACHMENT_SIZE = 1 * 1024 * 1024; // 1MB

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("文件读取失败"));
      }
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("文件读取失败"));
    };

    reader.readAsDataURL(file);
  });
}

export function detectAttachmentKind(
  mimeType: string | undefined
): Attachment["kind"] {
  if (!mimeType) return "file";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const formatted =
    size >= 100 ? Math.round(size).toString() : size.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
}
