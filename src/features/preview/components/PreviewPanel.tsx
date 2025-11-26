"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePreviewStore } from "../store/usePreviewStore";

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
  const { isOpen, code, language, closePreview, panelWidth, setPanelWidth } =
    usePreviewStore();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // 拖拽调整宽度
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRight =
        containerRef.current.parentElement?.getBoundingClientRect().right ??
        window.innerWidth;
      const newWidth = containerRight - moveEvent.clientX;
      const clampedWidth = Math.min(800, Math.max(280, newWidth));
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const srcDoc = useMemo(() => buildSrcDoc(code, language), [code, language]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          className="h-full border-l border-(--border-subtle) bg-(--surface-base) flex flex-col relative"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: panelWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* 拖拽分隔线 */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute left-0 top-0 h-full w-1.5 cursor-col-resize z-10 transition-colors ${
              isDragging
                ? "bg-(--border-hover)"
                : "bg-transparent hover:bg-(--border-hover)"
            }`}
          />

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
