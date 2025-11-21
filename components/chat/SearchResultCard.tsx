import { ExternalLink } from "lucide-react";

type SearchResultCardProps = {
  title: string;
  url: string;
  description?: string;
  delay?: number;
};

export function SearchResultCard({
  title,
  url,
  description,
  delay = 0,
}: SearchResultCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex w-[260px] shrink-0 flex-col gap-2 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-(--border-hover) hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:hover:border-(--border-strong) animate-fade-in-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-2">
        <div
          className="flex-1 text-sm font-semibold leading-snug text-foreground"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-(--text-tertiary) opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>

      {description ? (
        <p
          className="text-xs leading-relaxed text-(--text-secondary)"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </p>
      ) : (
        <p className="text-xs text-(--text-tertiary)">没有提供描述</p>
      )}

      <span className="truncate text-[11px] text-(--text-tertiary) underline-offset-4 transition-colors duration-200 group-hover:text-blue-500 dark:group-hover:text-blue-400">
        {url}
      </span>
    </a>
  );
}
