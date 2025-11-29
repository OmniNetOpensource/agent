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
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { formatFileSize } from "@/src/shared/utils/file";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { useAuth } from "@/src/features/auth/hooks/useAuth";

type ComposerProps = {
  isNewRoute: boolean;
};

export function Composer({ isNewRoute }: ComposerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const input = useChatStore((state) => state.input);
  const pending = useChatStore((state) => state.pending);
  const pendingAttachments = useChatStore((state) => state.pendingAttachments);
  const setInput = useChatStore((state) => state.setInput);
  const addAttachments = useChatStore((state) => state.addAttachments);
  const removeAttachment = useChatStore((state) => state.removeAttachment);
  const messages = useChatStore((state) => state.messages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const stop = useChatStore((state) => state.stop);

  const submitMessage = async () => {
    const trimmed = input.trim();
    const hasContent = trimmed.length > 0;
    const hasAttachment = pendingAttachments.length > 0;

    if (pending || (!hasContent && !hasAttachment)) {
      return;
    }

    await sendMessage(user ? router : undefined);
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

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    await addAttachments(Array.from(files));
    // 允许重复选择同一文件
    event.target.value = "";
  };

  const handlePickFiles = () => fileInputRef.current?.click();

  const hasText = input.trim().length > 0;
  const hasAttachments = pendingAttachments.length > 0;
  const sendDisabled = pending ? false : !hasText && !hasAttachments;
  const isNewchat = isNewRoute && messages.length === 0;

  const formClassName = isNewchat
    ? "flex flex-1 items-center justify-center py-12"
    : "absolute inset-x-0 bottom-0 z-[var(--z-composer)]";
  const containerClassName = isNewchat
    ? "w-full max-w-3xl px-3 sm:px-4 md:px-6"
    : "w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6";

  return (
    <form
      key={isNewchat ? "form-initial" : "form-bottom"}
      onSubmit={handleSubmit}
      className={formClassName}
    >
      <div className={containerClassName}>
        <div className="flex flex-col gap-3">
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-4 py-3 shadow-lg">
              {pendingAttachments.map((attachment) =>
                attachment.kind === "image" ? (
                  <div key={attachment.id} className="group relative">
                    <Image
                      src={attachment.dataUrl}
                      alt={attachment.name}
                      width={80}
                      height={80}
                      className="h-20 w-auto rounded-xl object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      aria-label="移除附件"
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    key={attachment.id}
                    className="flex min-w-[200px] max-w-60 items-center gap-3 rounded-xl border border-(--border-subtle) bg-background p-2 pr-3 shadow-sm"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-muted)">
                      <div className="flex h-full w-full items-center justify-center text-(--text-tertiary)">
                        <Paperclip className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">
                        {attachment.name}
                      </div>
                      <div className="text-[10px] text-(--text-tertiary)">
                        {formatFileSize(attachment.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="移除附件"
                      onClick={() => removeAttachment(attachment.id)}
                      className="rounded-full p-1 text-(--text-tertiary) transition-colors hover:bg-(--surface-hover) hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <div className="relative flex w-full items-end gap-2 rounded-3xl border border-(--border-subtle) bg-(--surface-card) p-2 shadow-lg transition-all focus-within:border-(--border-hover) focus-within:shadow-xl">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.txt,audio/*,video/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={handlePickFiles}
              className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-(--text-tertiary) transition-colors hover:bg-(--surface-hover) hover:text-foreground"
              title="添加附件"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <textarea
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
              className="min-h-10 max-h-[200px] flex-1 resize-none bg-transparent py-2.5 text-sm sm:text-base text-foreground placeholder:text-(--text-tertiary) focus:outline-none"
              style={{ height: "44px" }}
            />

            <button
              type={pending ? "button" : "submit"}
              disabled={sendDisabled}
              onClick={(event) => {
                if (pending) {
                  event.preventDefault();
                  stop();
                }
              }}
              className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                sendDisabled
                  ? "bg-(--surface-muted) text-(--text-tertiary) cursor-not-allowed"
                  : "bg-foreground text-background hover:scale-105 active:scale-95 shadow-md"
              }`}
            >
              {pending ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
