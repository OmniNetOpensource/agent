"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy, Download, Eye } from "lucide-react";
import { cx } from "@/src/shared/utils/cx";
import PreviewModal from "./PreviewModal";

type CodeBlockProps = {
  language?: string;
  code?: string;
  className?: string;
  children: ReactNode;
};

const languageToExtension: Record<string, string> = {
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  html: "html",
  css: "css",
  json: "json",
  python: "py",
  py: "py",
  bash: "sh",
  shell: "sh",
  sh: "sh",
  java: "java",
  csharp: "cs",
  cs: "cs",
  php: "php",
  ruby: "rb",
  go: "go",
  rust: "rs",
  kotlin: "kt",
  swift: "swift",
  sql: "sql",
};

const previewableLanguages = new Set(["html", "css", "javascript", "js"]);

const normalizeLanguage = (language?: string) => {
  if (!language) return "";
  const match = language.match(/language-([\w-]+)/);
  const raw = match?.[1] ?? language.trim().split(/\s+/)[0];
  return raw.toLowerCase();
};

export default function CodeBlock({
  language,
  code = "",
  className,
  children,
}: CodeBlockProps) {
  const normalizedLanguage = useMemo(
    () => normalizeLanguage(language),
    [language]
  );
  const hasCode = code.trim().length > 0;
  const extension = languageToExtension[normalizedLanguage] ?? "txt";
  const canPreview = previewableLanguages.has(normalizedLanguage);

  const [isCopied, setIsCopied] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleCopy = async () => {
    if (!hasCode || typeof navigator === "undefined") return;

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  const handleDownload = () => {
    if (!hasCode || typeof document === "undefined") return;

    const mime =
      normalizedLanguage === "html"
        ? "text/html"
        : normalizedLanguage === "css"
        ? "text/css"
        : "text/plain";

    const blob = new Blob([code], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `snippet.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handlePreview = () => {
    if (!canPreview || !hasCode) return;
    setIsPreviewOpen(true);
  };

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-card) px-2.5 py-1 text-[11px] font-medium text-(--text-tertiary) shadow-soft transition-colors hover:border-(--border-hover) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="group relative">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        {normalizedLanguage && (
          <span className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-(--text-tertiary)">
            {normalizedLanguage}
          </span>
        )}
        <div className="flex items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-base)/80 px-2 py-1 shadow-soft backdrop-blur-md">
          <button
            type="button"
            onClick={handleDownload}
            className={buttonClass}
            title="下载代码"
            aria-label="下载代码"
            disabled={!hasCode}
          >
            <Download className="h-3.5 w-3.5" />
            下载
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className={buttonClass}
            title={canPreview ? "预览代码" : "只能预览 HTML / CSS / JavaScript"}
            aria-label="预览代码"
            disabled={!canPreview || !hasCode}
          >
            <Eye className="h-3.5 w-3.5" />
            预览
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={buttonClass}
            title="复制到剪贴板"
            aria-label="复制到剪贴板"
            disabled={!hasCode}
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-(--color-success)" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {isCopied ? "已复制" : "复制"}
          </button>
        </div>
      </div>

      <pre
        className={cx(
          "not-prose overflow-x-auto rounded-md border border-(--code-block-border) bg-(--code-block-bg) px-4 pb-4 pr-20 pt-12 text-sm text-(--code-block-text)",
          className
        )}
      >
        {children}
      </pre>

      <PreviewModal
        open={isPreviewOpen}
        language={normalizedLanguage}
        code={code}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
