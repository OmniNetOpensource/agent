import { Attachment } from "@/src/features/chat/types/chat";
import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";

export const MAX_ATTACHMENT_SIZE = 1 * 1024 * 1024; // 1MB

const STORAGE_BUCKET = "upload files";

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

  const formatted = size >= 100 ? Math.round(size).toString() : size.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
}

export function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return "file";
  }

  const parts = trimmed.split(".");
  const extension = parts.length > 1 ? parts.pop() ?? "" : "";
  const baseNameRaw = parts.join(".") || "file";

  const baseName = baseNameRaw
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const safeBase = baseName || "file";

  return extension ? `${safeBase}.${extension}` : safeBase;
}

export function generateFilePath(userId: string, filename: string): string {
  const sanitized = sanitizeFilename(filename);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);

  return `${userId}/${timestamp}-${randomSuffix}-${sanitized}`;
}

export async function uploadFileToStorage(
  file: File,
  userId: string
): Promise<string> {
  if (!userId) {
    throw new Error("用户未登录，无法上传文件。");
  }

  let supabase;
  try {
    supabase = createSupabaseBrowserClient();
  } catch (error) {
    console.error("[Upload] 创建 Supabase 客户端失败:", error);
    throw new Error("文件上传失败：Supabase 未正确配置。");
  }

  const path = generateFilePath(userId, file.name);

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error || !data) {
    console.error("[Upload] Supabase 上传失败:", error);
    throw new Error("文件上传失败，请稍后重试。");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);

  if (!publicUrl) {
    throw new Error("文件上传失败：无法获取公共访问地址。");
  }

  return publicUrl;
}
