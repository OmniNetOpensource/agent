export function PendingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-sm p-4 flex items-center gap-3 ">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-(--text-tertiary)">
          AI 助手
        </span>
        <span className="flex gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-(--color-accent) animate-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
