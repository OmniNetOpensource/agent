"use client";

import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { ImagePreview } from "@/src/shared/components/ImagePreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/src/shared/toast";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import {
  MAX_ATTACHMENT_SIZE,
  createBlobUrl,
  detectAttachmentKind,
  formatFileSize,
} from "@/src/shared/utils/file";
import type { Attachment } from "@/src/features/chat/types/chat";
import { setActiveInput } from "../../lib/active-input";

type MessageEditorProps = {
  messageId: string;
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

export function MessageEditor({ messageId }: MessageEditorProps) {
  const router = useRouter();
  const editingState = useChatStore((state) => state.editingState);
  const updateEditContent = useChatStore((state) => state.updateEditContent);
  const updateEditAttachments = useChatStore(
    (state) => state.updateEditAttachments
  );
  const cancelEditing = useChatStore((state) => state.cancelEditing);
  const submitEdit = useChatStore((state) => state.submitEdit);
  const uploading = useChatStore((state) => state.uploading);
  const pending = useChatStore((state) => state.pending);
  const currentModel = useChatStore((state) => state.currentModel);

  const state =
    editingState?.messageId === messageId ? editingState : null;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (state && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [state]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeightValue = parseFloat(computedStyle.lineHeight);
    const paddingTopValue = parseFloat(computedStyle.paddingTop);
    const paddingBottomValue = parseFloat(computedStyle.paddingBottom);

    const fallbackLineHeight = 20;
    const lineHeight = Number.isFinite(lineHeightValue)
      ? lineHeightValue
      : fallbackLineHeight;
    const paddingTop = Number.isFinite(paddingTopValue) ? paddingTopValue : 0;
    const paddingBottom = Number.isFinite(paddingBottomValue)
      ? paddingBottomValue
      : 0;
    const maxLines = 5;
    const maxHeight = lineHeight * maxLines + paddingTop + paddingBottom;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);

    textarea.style.height = `${newHeight}px`;
  }, [state?.editedContent]);

  if (!state) {
    return null;
  }

  const { editedContent, editedAttachments } = state;
  const hasText = editedContent.trim().length > 0;
  const hasAttachments = editedAttachments.length > 0;
  const sendDisabled =
    pending || uploading || (!hasText && !hasAttachments) || !currentModel;

  const handleAddAttachments = async (files: File[]) => {
    if (!files.length) {
      return;
    }
    if (uploading) {
      toast.info("正在上传附件，请稍后再试。");
      return;
    }

    const attachments = await buildAttachmentsFromFiles(files);
    if (attachments.length === 0) {
      return;
    }

    updateEditAttachments([...editedAttachments, ...attachments]);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return;
    }

    const pastedFiles: File[] = [];
    if (clipboardData.files?.length) {
      pastedFiles.push(...Array.from(clipboardData.files));
    } else if (clipboardData.items?.length) {
      for (const item of Array.from(clipboardData.items)) {
        if (item.kind !== "file") {
          continue;
        }
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }

    if (pastedFiles.length === 0) {
      return;
    }

    event.preventDefault();
    void handleAddAttachments(pastedFiles);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sendDisabled) {
        submitEdit((path) => router.push(path));
      }
    }
  };

  return (
    <div className="relative flex w-full flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="取消编辑"
        onClick={cancelEditing}
        className="absolute right-2 top-2 h-7 w-7 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </Button>

      {hasAttachments && (
        <div className="flex flex-wrap gap-2">
          {editedAttachments.map((attachment) =>
            attachment.kind === "image" ? (
              <div key={attachment.id} className="group relative">
                <ImagePreview
                  url={attachment.displayUrl}
                  name={attachment.name}
                  size={attachment.size}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="移除附件"
                  onClick={() =>
                    updateEditAttachments(
                      editedAttachments.filter(
                        (item) => item.id !== attachment.id
                      )
                    )
                  }
                  className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div
                key={attachment.id}
                className="flex min-w-[200px] max-w-60 items-center gap-3 rounded-lg border bg-background p-2 pr-3"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">
                    {attachment.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="移除附件"
                  onClick={() =>
                    updateEditAttachments(
                      editedAttachments.filter(
                        (item) => item.id !== attachment.id
                      )
                    )
                  }
                  className="h-6 w-6 rounded-full hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          )}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={editedContent}
        onChange={(event) => updateEditContent(event.target.value)}
        onFocus={() => {
          setActiveInput({
            getValue: () => useChatStore.getState().editingState?.editedContent ?? '',
            setValue: (v) => useChatStore.getState().updateEditContent(v),
            focus: () => textareaRef.current?.focus(),
          });
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        rows={1}
        placeholder="编辑消息内容..."
        className="min-h-10 max-h-[200px] resize-none border-0 bg-transparent py-2.5 text-sm focus-visible:ring-0 sm:text-base"
        style={{ height: "44px" }}
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              void handleAddAttachments(files);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="h-3.5 w-3.5" />
            添加附件
          </Button>
        </div>
        <Button
          type="button"
          onClick={() => submitEdit((path) => router.push(path))}
          disabled={sendDisabled}
          size="icon"
          aria-label="发送编辑"
          className={cn(
            "h-8 w-8 rounded-full transition-all duration-200",
            sendDisabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "hover:scale-105 active:scale-95"
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
