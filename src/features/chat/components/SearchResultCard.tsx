import { ExternalLink, Globe, Lock } from "lucide-react";
import { cx } from "@/src/shared/utils/cx";

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
  const hostname = tryGetHostname(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={cx(
        "group relative flex w-[280px] shrink-0 flex-col gap-3 rounded-xl p-4 transition-all duration-500 ease-out",
        "bg-(--surface-card) border border-(--border-subtle)",
        "hover:-translate-y-2 hover:shadow-float hover:border-(--border-hover)",
        "animate-enter-down"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Tech Decoration Lines - Minimalist */}
      <div className="absolute -left-px top-6 h-6 w-[2px] bg-foreground opacity-0 transition-all duration-300 group-hover:opacity-100" />
      <div className="absolute -right-px bottom-6 h-6 w-[2px] bg-foreground opacity-0 transition-all duration-300 group-hover:opacity-100" />
      
      {/* Header */}
      <div className="relative z-10 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--surface-hover) text-foreground transition-all duration-300 group-hover:scale-105">
          <Globe className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)">
            <Lock className="h-2.5 w-2.5" />
            <span className="truncate uppercase">{hostname}</span>
          </div>
          <div
            className="text-sm font-bold leading-tight text-foreground transition-colors"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="relative z-10 min-h-[40px]">
        {description ? (
          <p
            className="text-xs leading-relaxed text-(--text-secondary) font-medium"
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
          <p className="text-xs italic text-(--text-tertiary)">No metadata available</p>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-(--border-subtle) pt-3 mt-auto">
        <span className="truncate text-[10px] font-mono font-medium text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)">
          SOURCE_LINK_V1
        </span>
        <div className="flex items-center gap-1 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 text-(--color-brand)">
           <span className="text-[10px] font-bold">VISIT</span>
           <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
}

function tryGetHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "UNKNOWN";
  }
}
