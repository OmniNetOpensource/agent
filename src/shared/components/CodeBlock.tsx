"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  const normalizedLanguage = normalizeLanguage(language);
  const hasCode = code.trim().length > 0;
  const extension = languageToExtension[normalizedLanguage] ?? "txt";

  const [isCopied, setIsCopied] = useState(false);
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

  return (
    <div className="group rounded-lg border bg-muted/50">
      {/* Header */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "sticky top-0 z-10 flex cursor-pointer items-center justify-between bg-transparent px-4 py-2 hover:bg-accent transition-all duration-75 ease-in-out",
          isCollapsed ? "rounded-lg" : "rounded-t-lg"
        )}
      >
        {/* Left: expand/collapse icon + language label */}
        <div className="flex items-center gap-1.5">
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {normalizedLanguage ? (
            <span className="text-xs font-medium text-muted-foreground">
              {normalizedLanguage.toUpperCase()}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Code</span>
          )}
        </div>

        {/* Right: action buttons */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            title="下载代码"
            aria-label="下载代码"
            disabled={!hasCode}
            className="h-7 gap-1 px-2 text-[11px]"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">下载</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            title="复制到剪贴板"
            aria-label="复制到剪贴板"
            disabled={!hasCode}
            className="h-7 gap-1 px-2 text-[11px]"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {isCopied ? "已复制" : "复制"}
            </span>
          </Button>
        </div>
      </div>

      {/* Code area */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-75 ease-in-out",
          isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        )}
      >
        <pre
          className={cn(
            className,
            "overflow-hidden overflow-x-auto rounded-none bg-transparent text-sm transition-[padding] duration-75 ease-in-out",
            isCollapsed ? "py-0 px-4" : "p-4"
          )}
        >
          {children}
        </pre>
      </div>
    </div>
  );
}
