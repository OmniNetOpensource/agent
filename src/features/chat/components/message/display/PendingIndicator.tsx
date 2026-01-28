"use client";

export function PendingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-(--border-primary) bg-(--surface-muted) shadow-sm p-4 flex items-center gap-3 ">
        <span className="flex gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-(--feedback-loading) animate-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
