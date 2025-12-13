"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUp, Globe, Loader2, Paperclip, Square, X } from "lucide-react";
import { formatFileSize } from "@/src/shared/utils/file";
import {
  useChatStore,
  useIsNewChat,
} from "@/src/features/chat/store/useChatStore";
import { ModelSelector } from "./ModelSelector";
import { CustomInstructionButton } from "./CustomInstructionButton";
import { getModelPermissions } from "@/src/features/chat/lib/model-config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/src/shared/toast";

export function Composer() {
  const router = useRouter();
  const input = useChatStore((state) => state.input);
  const pending = useChatStore((state) => state.pending);
  const pendingAttachments = useChatStore((state) => state.pendingAttachments);
  const uploading = useChatStore((state) => state.uploading);
  const currentModel = useChatStore((state) => state.currentModel);
  const setInput = useChatStore((state) => state.setInput);
  const addAttachments = useChatStore((state) => state.addAttachments);
  const removeAttachment = useChatStore((state) => state.removeAttachment);
  const searchEnabled = useChatStore((state) => state.searchEnabled);
  const setSearchEnabled = useChatStore((state) => state.setSearchEnabled);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const stop = useChatStore((state) => state.stop);

  const submitMessage = async () => {
    const trimmed = input.trim();
    const hasContent = trimmed.length > 0;
    const hasAttachment = pendingAttachments.length > 0;
    const hasModel = !!currentModel;

    if (pending || (!hasContent && !hasAttachment) || !hasModel) {
      if (!hasModel) {
        toast.warning("请先选择模型");
      }
      return;
    }

    await sendMessage((path) => router.push(path));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage();
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  const adjustTextareaHeight = () => {
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
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Get model permissions
  const modelPermissions = currentModel
    ? getModelPermissions(currentModel)
    : undefined;
  const canUpload = modelPermissions?.canUpload ?? true;
  const canSearch = modelPermissions?.canSearch ?? true;

  // Force searchEnabled to false if model doesn't support search
  useEffect(() => {
    if (!canSearch && searchEnabled) {
      setSearchEnabled(false);
    }
  }, [canSearch, searchEnabled, setSearchEnabled]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (uploading || !canUpload) {
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    await addAttachments(Array.from(files));
    event.target.value = "";
  };

  const handlePickFiles = () => fileInputRef.current?.click();

  const hasText = input.trim().length > 0;
  const hasAttachments = pendingAttachments.length > 0;
  const hasModel = !!currentModel;
  // Disable send if model doesn't allow uploads but attachments exist
  const hasInvalidAttachments = hasAttachments && !canUpload;
  const sendDisabled = pending
    ? false
    : (!hasText && !hasAttachments) ||
      !hasModel ||
      uploading ||
      hasInvalidAttachments;
  const isNewchat = useIsNewChat();

  const formClassName = isNewchat
    ? // 移除了 px-3 sm:px-4 md:px-6
      "flex flex-col flex-1 items-center justify-center py-12 w-[90%] md:w-[60%] mx-auto gap-3"
    : // 1. 移除了 px-3 sm:px-4 md:px-6
      // 2. 将 py-4 md:py-6 改为了 mb-4 md:mb-6 (仅底部外边距)
      "absolute inset-x-0 bottom-0 z-(--z-composer) flex flex-col w-[90%] md:w-[60%] mx-auto mb-4 md:mb-6 gap-3";

  return (
    <form
      key={isNewchat ? "form-initial" : "form-bottom"}
      onSubmit={handleSubmit}
      className={formClassName}
    >
      <div className="relative flex w-full flex-col gap-1 rounded-3xl border bg-card p-2 shadow-lg transition-all focus-within:border-ring focus-within:shadow-xl">
        {hasAttachments && (
          <div className="flex flex-wrap gap-2 rounded-2xl bg-card px-0 py-0">
            {hasInvalidAttachments && (
              <div className="w-full rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                当前模型不支持上传附件，请先移除附件或切换模型
              </div>
            )}
            {pendingAttachments.map((attachment) =>
              attachment.kind === "image" ? (
                <div key={attachment.id} className="group relative">
                  <Image
                    src={attachment.url}
                    alt={attachment.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-xl object-cover"
                    unoptimized
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="移除附件"
                    onClick={() => removeAttachment(attachment.id)}
                    className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  key={attachment.id}
                  className="flex min-w-[200px] max-w-60 items-center gap-3 rounded-xl border bg-background p-2 pr-3 shadow-sm"
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
                    onClick={() => removeAttachment(attachment.id)}
                    className="h-6 w-6 rounded-full hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            )}
          </div>
        )}

        <div className="flex w-full items-end gap-2">
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.txt,audio/*,video/*"
            className="hidden"
          />

          <Textarea
            ref={textareaRef}
            id="message-input"
            name="message"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="输入您的消息..."
            className="min-h-10 max-h-[200px] flex-1 resize-none border-0 bg-transparent py-2.5 text-sm focus-visible:ring-0 sm:text-base"
            style={{ height: "44px" }}
          />

          <Button
            type={pending ? "button" : "submit"}
            disabled={sendDisabled}
            onClick={(event) => {
              if (pending) {
                event.preventDefault();
                stop();
              }
            }}
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-10 transition-all duration-200",
              sendDisabled
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "hover:scale-105 active:scale-95"
            )}
          >
            {pending ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <ArrowUp className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <span
              title={
                canSearch
                  ? "开启后，模型会自主决定是否搜索"
                  : "当前模型不支持搜索功能"
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearchEnabled(!searchEnabled)}
                disabled={!canSearch}
                className={cn(
                  "group h-7 gap-1.5 rounded-full px-2 text-xs font-medium",
                  !canSearch &&
                    "cursor-not-allowed opacity-50 hover:text-muted-foreground",
                  canSearch &&
                    (searchEnabled
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground hover:text-foreground")
                )}
              >
                <Globe
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    canSearch &&
                      (searchEnabled ? "scale-110" : "group-hover:scale-110")
                  )}
                />
                <span>联网</span>
              </Button>
            </span>
            <span
              title={
                uploading
                  ? "正在上传附件..."
                  : !canUpload
                  ? "当前模型不支持上传附件"
                  : "添加附件"
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePickFiles}
                disabled={uploading || !canUpload}
                className="h-7 gap-1.5 rounded-full px-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
              </Button>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CustomInstructionButton />
            <ModelSelector />
          </div>
        </div>
      </div>
    </form>
  );
}
