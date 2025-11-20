import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, Square, X, FileText, Image as ImageIcon, Music, Video } from "lucide-react";
import { formatFileSize } from "@/utils/file";
import { useChatComposer } from "@/hooks/useChat";
import { Attachment } from "@/types/chat";

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
  const [isFocused, setIsFocused] = useState(false);

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

      const fallbackLineHeight = 24;
      const lineHeight = Number.isFinite(lineHeightValue)
        ? lineHeightValue
        : fallbackLineHeight;
      const paddingTop = Number.isFinite(paddingTopValue)
        ? paddingTopValue
        : 0;
      const paddingBottom = Number.isFinite(paddingBottomValue)
        ? paddingBottomValue
        : 0;
      const maxLines = 8;
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
      event.target.value = "";
    },
    [addAttachments]
  );

  const handlePickFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const getFileIcon = (kind: string) => {
    switch (kind) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const hasText = input.trim().length > 0;
  const hasAttachments = pendingAttachments.length > 0;
  const sendDisabled = pending ? false : !hasText && !hasAttachments;
  
  // Dynamic classes based on state
  const wrapperClasses = isInitial
    ? "flex min-h-full items-center justify-center p-4 sm:p-8"
    : "absolute inset-x-0 bottom-0 z-20 flex justify-center p-4 pb-6 sm:px-8";
    
  const containerClasses = `
    relative w-full max-w-3xl transition-all duration-300 ease-out
    ${isInitial ? "scale-100 opacity-100" : "scale-100"}
    ${isFocused ? "shadow-glow translate-y-[-2px]" : "shadow-float"}
  `;

  const glassClasses = `
    bg-(--surface-card)/80 backdrop-blur-xl
    border border-(--border-subtle)
    rounded-[2rem]
    overflow-hidden
    transition-all duration-300
  `;

  return (
    <form
      key={isInitial ? "form-initial" : "form-bottom"}
      onSubmit={handleSubmit}
      className={wrapperClasses}
    >
      <div className={containerClasses}>
        <div className={`${glassClasses} flex flex-col`}>
          
          {/* Attachments Area */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-3 p-4 pb-0 animate-fade-in">
              {pendingAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="group relative flex items-center gap-3 rounded-2xl border border-(--border-subtle)/50 bg-(--surface-muted)/50 pl-2 pr-8 py-2 transition-all hover:bg-(--surface-muted)"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-(--border-subtle)/50 bg-white">
                    {attachment.kind === "image" ? (
                      <img
                        src={attachment.dataUrl}
                        alt={attachment.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-(--text-tertiary)">
                        {getFileIcon(attachment.kind)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 max-w-[120px]">
                    <div className="truncate text-xs font-medium text-(--text-primary)">
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
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-(--text-tertiary)/70 opacity-0 transition-all hover:bg-(--surface-card) hover:text-red-500 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="flex items-end gap-2 p-3">
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
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-(--text-tertiary) transition-all hover:bg-(--surface-muted) hover:text-(--text-primary)"
              title="添加附件"
            >
              <Paperclip className="h-5 w-5 transition-transform group-hover:-rotate-45" />
            </button>

            <textarea
              ref={textareaRef}
              id="message-input"
              name="message"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                adjustTextareaHeight(event.currentTarget);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask anything..."
              className="flex-1 max-h-[200px] min-h-[44px] resize-none bg-transparent py-[10px] text-[15px] leading-relaxed text-(--text-primary) placeholder:text-(--text-tertiary)/70 focus:outline-none"
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
              className={`
                flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300
                ${
                  sendDisabled
                    ? "bg-(--surface-muted) text-(--text-tertiary) cursor-not-allowed"
                    : "bg-(--button-primary-bg) text-(--button-primary-text) shadow-lg shadow-(--button-primary-bg)/20 hover:scale-105 hover:shadow-xl hover:shadow-(--button-primary-bg)/30 active:scale-95"
                }
              `}
            >
              {pending ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        
        {/* Footer helper text */}
        {isInitial && (
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-(--text-tertiary) animate-fade-in animate-delay-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded border border-(--border-subtle) bg-(--surface-muted) text-center font-mono text-[10px] leading-[14px]">↵</span>
              发送
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded border border-(--border-subtle) bg-(--surface-muted) text-center font-mono text-[10px] leading-[14px]">⇧</span>
              <span className="inline-block h-4 w-4 rounded border border-(--border-subtle) bg-(--surface-muted) text-center font-mono text-[10px] leading-[14px]">↵</span>
              换行
            </span>
          </div>
        )}
      </div>
    </form>
  );
}
