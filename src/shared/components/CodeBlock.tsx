"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Download, Eye } from "lucide-react";
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    "inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-(--text-tertiary) transition-colors hover:bg-(--surface-hover) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="group overflow-hidden rounded-lg border border-(--code-block-border)">
      {/* Header - 点击可收起/展开 */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex cursor-pointer items-center justify-between border-b border-(--code-block-border) bg-(--surface-subtle) px-4 py-2 hover:bg-(--surface-hover) transition-colors"
      >
        {/* 左侧：展开/收起图标 + 语言标签 */}
        <div className="flex items-center gap-1.5">
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-(--text-tertiary)" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-(--text-tertiary)" />
          )}
          {normalizedLanguage ? (
            <span className="text-xs font-medium text-(--text-secondary)">
              {normalizedLanguage.toUpperCase()}
            </span>
          ) : (
            <span className="text-xs text-(--text-tertiary)">Code</span>
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canPreview && (
            <button
              type="button"
              onClick={handlePreview}
              className={buttonClass}
              title="预览代码"
              aria-label="预览代码"
              disabled={!hasCode}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">预览</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className={buttonClass}
            title="下载代码"
            aria-label="下载代码"
            disabled={!hasCode}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">下载</span>
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
            <span className="hidden sm:inline">{isCopied ? "已复制" : "复制"}</span>
          </button>
        </div>
      </div>

      {/* 代码区域 */}
      {!isCollapsed && (
        <pre
          className={cx(
            className,
            "not-prose overflow-x-auto rounded-none bg-(--code-block-bg) p-4 text-sm text-(--code-block-text)"
          )}
        >
          {children}
        </pre>
      )}

      <PreviewModal
        open={isPreviewOpen}
        language={normalizedLanguage}
        code={code}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
