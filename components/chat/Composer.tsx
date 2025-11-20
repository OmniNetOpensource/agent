import { ChangeEvent, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { formatFileSize } from "@/utils/file";
import { useChatComposer } from "@/hooks/useChat";

type ComposerProps = {
  isInitial: boolean;
};

export function Composer({ isInitial }: ComposerProps) {
  const {
    input,
    pending,
    pendingAttachments,
    setInput,
    addAttachments,
    removeAttachment,
    handleSubmit,
    handleKeyDown,
    stop,
  } = useChatComposer();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const adjustTextareaHeight = useCallback(
    (element?: HTMLTextAreaElement | null) => {
      const textarea = element ?? textareaRef.current;
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
      const paddingTop = Number.isFinite(paddingTopValue)
        ? paddingTopValue
        : 0;
      const paddingBottom = Number.isFinite(paddingBottomValue)
        ? paddingBottomValue
        : 0;
      const maxLines = 5;
      const maxHeight = lineHeight * maxLines + paddingTop + paddingBottom;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);

      textarea.style.height = `${newHeight}px`;
    },
    []
  );

  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight, input]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        return;
      }
      await addAttachments(Array.from(files));
      // 允许重复选择同一文件
      event.target.value = "";
    },
    [addAttachments]
  );

  const handlePickFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const hasText = input.trim().length > 0;
  const hasAttachments = pendingAttachments.length > 0;
  const sendDisabled = pending ? false : !hasText && !hasAttachments;
  const formClassName = isInitial
    ? "flex h-full items-center justify-center py-12"
    : "absolute inset-x-0 bottom-0 z-20 ";
  const containerClassName = isInitial
    ? "w-full max-w-3xl animate-enter-down"
    : "w-full max-w-3xl mx-auto px-4 py-3 md:px-8 animate-enter-up";

  return (
    <form
      key={isInitial ? "form-initial" : "form-bottom"}
      onSubmit={handleSubmit}
      className={formClassName}
    >
      <div className={containerClassName}>
        <div className="flex flex-col gap-3">
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-3 py-2">
              {pendingAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex min-w-[220px] flex-1 items-center gap-3 rounded-xl border border-(--border-subtle) bg-background px-3 py-2 shadow-sm"
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-md border border-(--border-subtle) bg-(--surface-card)">
                    {attachment.kind === "image" ? (
                      <Image
                        src={attachment.dataUrl}
                        alt={attachment.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-(--text-tertiary)">
                        <Paperclip className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {attachment.name}
                    </div>
                    <div className="text-xs text-(--text-tertiary)">
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="移除附件"
                    onClick={() => removeAttachment(attachment.id)}
                    className="rounded-full p-1 text-(--text-tertiary) transition-colors hover:bg-(--surface-card) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-row gap-3 items-end justify-center w-full">
            <div className="flex items-center">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.txt,audio/*,video/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={handlePickFiles}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-(--button-secondary-border) bg-(--button-secondary-bg) text-(--button-secondary-text) transition-colors hover:bg-(--button-secondary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                title="添加附件"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              id="message-input"
              name="message"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                adjustTextareaHeight(event.currentTarget);
              }}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="输入您的消息..."
              className="flex-1 min-h-18 resize-none rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-5 py-4 text-sm text-foreground placeholder:text-(--text-tertiary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:border-neutral-400 transition-shadow overflow-y-auto"
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
              className="w-fit h-fit p-3 inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-(--button-primary-bg) text-(--button-primary-text) hover:bg-(--button-primary-hover)"
            >
              {pending ? <Square className="h-6 w-6" /> : <ArrowUp className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
