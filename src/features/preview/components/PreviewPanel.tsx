"use client";

import { useRef } from "react";
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
      ? `
  <script>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const DEFAULT_WIDTH = 480;

  // 拖拽调整宽度
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    // 禁用 iframe 鼠标事件，避免拖拽被 iframe 捕获
    const iframe = containerRef.current?.querySelector("iframe");
    if (iframe) {
      iframe.style.pointerEvents = "none";
    }

    const containerRight = window.innerWidth;
    let rafId: number | null = null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const newWidth = containerRight - moveEvent.clientX;
        const clampedWidth = Math.min(700, Math.max(300, newWidth));
        containerRef.current.style.width = `${clampedWidth}px`;
        rafId = null;
      });
    };

    const handleMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (iframe) {
        iframe.style.pointerEvents = "";
      }
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

  const srcDoc = buildSrcDoc(code, language);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="relative hidden md:flex h-full flex-col p-3 md:p-4 lg:p-5 shrink-0"
      style={{ width: DEFAULT_WIDTH }}
    >
      {/* 拖拽分隔线 */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 h-full w-4 -translate-x-1/2 cursor-col-resize z-(--z-draggable) flex items-center justify-center group"
      >
        {/* 细线 */}
        <div
          className={`h-full w-[2px] transition-colors bg-(--text-tertiary) group-hover:bg-(--text-secondary)`}
        />
        {/* 椭圆手柄 */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1.5 rounded-full transition-colors bg-(--text-tertiary) group-hover:bg-(--text-secondary)`}
        />
      </div>

      {/* Header */}
      <div className="flex items-center h-12 border border-b-0 border-(--border-subtle) rounded-t-xl bg-(--surface-base) px-4 shrink-0">
        <div className="text-sm font-semibold text-(--text-secondary)">
          实时预览 {language ? `· ${language.toUpperCase()}` : ""}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={closePreview}
          className="inline-flex items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-card) px-3 py-1.5 text-xs font-medium text-(--text-secondary) shadow-sm transition-colors hover:border-(--border-hover) hover:text-foreground"
        >
          <X className="h-4 w-4" />
          关闭
        </button>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 min-h-0 flex flex-col border border-t-0 border-(--border-subtle) rounded-b-xl bg-(--surface-base) overflow-hidden">
        <div className="flex-1 min-h-0 bg-background">
          <iframe
            title="代码预览"
            srcDoc={srcDoc}
            className="h-full w-full border-0"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
