"use client";

import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { formatFileSize } from "@/src/shared/utils/file";
import { ImagePreview } from "@/src/shared/components/ImagePreview";
import {
  useChatStore,
  useIsNewChat,
} from "@/src/features/chat/store/useChatStore";
import { ComposerToolbar } from "./ComposerToolbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/src/shared/toast";
import { setActiveInput, setDefaultInput } from "../../lib/active-input";

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

  useEffect(() => {
    setDefaultInput({
      getValue: () => useChatStore.getState().input,
      setValue: (v) => useChatStore.getState().setInput(v),
      focus: () => textareaRef.current?.focus(),
    });
  }, []);

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

    if (uploading) {
      toast.info("正在上传附件，请稍后再试。");
      return;
    }

    void addAttachments(pastedFiles);
  };

  const hasText = input.trim().length > 0;
  const hasAttachments = pendingAttachments.length > 0;
  const hasModel = !!currentModel;
  const sendDisabled = pending
    ? false
    : (!hasText && !hasAttachments) ||
      !hasModel ||
      uploading;
  const isNewchat = useIsNewChat();

  const formClassName = isNewchat
    ? // 移除了 px-3 sm:px-4 md:px-6
      "flex flex-col flex-1 items-center justify-center py-12 w-[90%] md:w-[50%] mx-auto gap-3"
    : // 1. 移除了 px-3 sm:px-4 md:px-6
      // 2. 将 py-4 md:py-6 改为了 mb-4 md:mb-6 (仅底部外边距)
      "absolute inset-x-0 bottom-0 z-(--z-composer) flex flex-col w-[90%] md:w-[50%] mx-auto mb-4 md:mb-6 gap-3";

  return (
    <form
      key={isNewchat ? "form-initial" : "form-bottom"}
      onSubmit={handleSubmit}
      className={formClassName}
    >
      <div className="relative flex w-full flex-col gap-1 rounded-2xl border bg-card p-2 shadow-lg transition-all focus-within:border-ring focus-within:shadow-xl">
        {hasAttachments && (
          <div className="flex flex-wrap gap-2 rounded-2xl bg-card px-0 py-0">
            {pendingAttachments.map((attachment) =>
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
                    onClick={() => removeAttachment(attachment.id)}
                    className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  key={attachment.id}
                  className="flex min-w-[200px] max-w-60 items-center gap-3 rounded-lg border bg-background p-2 pr-3 shadow-sm"
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
          <Textarea
            ref={textareaRef}
            id="message-input"
            name="message"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            onFocus={() => {
              setActiveInput({
                getValue: () => useChatStore.getState().input,
                setValue: (v) => useChatStore.getState().setInput(v),
                focus: () => textareaRef.current?.focus(),
              });
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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

        <ComposerToolbar />
      </div>
    </form>
  );
}
