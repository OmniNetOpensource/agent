"use client";

import { FormEvent, KeyboardEvent, Dispatch, SetStateAction } from "react";
import { Loader2, Send } from "lucide-react";

type ComposerProps = {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  isInitial: boolean;
};

export function Composer({
  input,
  setInput,
  pending,
  onSubmit,
  onKeyDown,
  isInitial,
}: ComposerProps) {
  const sendDisabled = pending || input.trim().length === 0;
  const formClassName = isInitial
    ? "flex flex-1 items-center justify-center py-12"
    : "mt-6 border-t border-(--border-subtle) pt-6";
  const containerClassName = isInitial
    ? "w-full max-w-3xl animate-enter-down"
    : "animate-enter-up";

  return (
    <form
      key={isInitial ? "form-initial" : "form-bottom"}
      onSubmit={onSubmit}
      className={formClassName}
    >
      <div className={containerClassName}>
        <div className="flex flex-row gap-3 items-center justify-center w-full">
          <textarea
            id="message-input"
            name="message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="输入您的消息..."
            className="w-[90%] min-h-18 resize-none rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-5 py-4 text-sm text-foreground placeholder:text-(--text-tertiary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:border-neutral-400 transition-shadow"
          />
          <button
            type="submit"
            disabled={sendDisabled}
            className="w-fit h-fit p-3 inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-(--button-primary-bg) text-(--button-primary-text) hover:bg-(--button-primary-hover)"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
