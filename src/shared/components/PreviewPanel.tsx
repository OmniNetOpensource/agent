"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePreviewStore } from "@/src/shared/store/usePreviewStore";

const buildSrcDoc = (code: string, language?: string) => {
  const normalized = (language || "").toLowerCase();
  const isHtml = normalized === "html";
  const isCss = normalized === "css";
  const isJs = normalized === "javascript" || normalized === "js";

  const baseStyles = `
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }
  `;

  const htmlContent = isHtml ? code : '<div id="preview-root"></div>';
  const cssContent = isCss ? code : "";
  const safeScript = isJs ? code.replace(/<\/script/gi, "<\\/script") : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    ${baseStyles}
    ${cssContent}
  </style>
</head>
<body>
  ${htmlContent}
  ${
    safeScript
      ? `<script>
  try {
    ${safeScript}
  } catch (error) {
    document.body.innerHTML = '<pre style="color: #ef4444; font-family: monospace; white-space: pre-wrap;">' + (error?.stack || error) + '</pre>';
  }
  </script>`
      : ""
  }
</body>
</html>`;
};

export function PreviewPanel() {
  const { isOpen, code, language, closePreview } = usePreviewStore();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePreview();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closePreview]);

  const srcDoc = useMemo(() => buildSrcDoc(code, language), [code, language]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="h-full border-l border-(--border-subtle) bg-(--surface-base) flex flex-col"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 480, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-(--border-subtle) bg-(--surface-muted) px-4 py-3 shrink-0">
            <div className="text-sm font-semibold text-(--text-secondary)">
              实时预览 {language ? `· ${language.toUpperCase()}` : ""}
            </div>
            <button
              type="button"
              onClick={closePreview}
              className="inline-flex items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-card) px-3 py-1.5 text-xs font-medium text-(--text-secondary) shadow-sm transition-colors hover:border-(--border-hover) hover:text-(--text-primary)"
            >
              <X className="h-4 w-4" />
              关闭
            </button>
          </div>

          {/* Preview iframe */}
          <div className="flex-1 min-h-0 bg-(--surface-base)">
            <iframe
              title="代码预览"
              srcDoc={srcDoc}
              className="h-full w-full border-0"
              sandbox="allow-scripts"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
