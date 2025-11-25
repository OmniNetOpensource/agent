"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type PreviewModalProps = {
  open: boolean;
  code: string;
  language?: string;
  onClose: () => void;
};

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

export default function PreviewModal({
  open,
  code,
  language,
  onClose,
}: PreviewModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const srcDoc = useMemo(() => buildSrcDoc(code, language), [code, language]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="relative z-10 mx-auto flex h-full max-h-[90vh] w-full max-w-6xl items-center justify-center p-4">
            <motion.div
              className="w-full overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-float"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-(--border-subtle) bg-(--surface-muted) px-4 py-3">
                <div className="text-sm font-semibold text-(--text-secondary)">
                  实时预览 {language ? `· ${language}` : ""}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-card) px-3 py-1.5 text-xs font-medium text-(--text-secondary) shadow-sm transition-colors hover:border-(--border-hover) hover:text-(--text-primary)"
                >
                  <X className="h-4 w-4" />
                  关闭
                </button>
              </div>

              <div className="bg-(--surface-base)">
                <iframe
                  title="代码预览"
                  srcDoc={srcDoc}
                  className="h-[70vh] w-full border-0"
                  sandbox="allow-scripts"
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
