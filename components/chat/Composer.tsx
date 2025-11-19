import { Send, Square } from "lucide-react";
import { useChatComposer } from "@/hooks/useChat";

type ComposerProps = {
  isInitial: boolean;
};

export function Composer({ isInitial }: ComposerProps) {
  const { input, pending, setInput, handleSubmit, handleKeyDown, stop } =
    useChatComposer();

  const sendDisabled = !pending && input.trim().length === 0;
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
        <div className="flex flex-row gap-3 items-center justify-center w-full">
          <textarea
            id="message-input"
            name="message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="输入您的消息..."
            className="w-[90%] min-h-18 resize-none rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-5 py-4 text-sm text-foreground placeholder:text-(--text-tertiary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:border-neutral-400 transition-shadow"
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
            {pending ? <Square className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </form>
  );
}
