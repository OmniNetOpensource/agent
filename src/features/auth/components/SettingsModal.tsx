"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut, X } from "lucide-react";

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  onSignOut: () => Promise<void> | void;
};

export function SettingsModal({
  open,
  onClose,
  onSignOut,
}: SettingsModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleSignOut = async () => {
    await onSignOut();
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative h-[50vh] w-[50vw] min-w-[320px] max-w-4xl rounded-[var(--radius-lg)] border border-(--border-subtle) bg-(--surface-card) p-6 shadow-lg animate-scale-in"
        style={{ boxShadow: "var(--shadow-float)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors hover:bg-(--surface-hover) hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex h-[calc(100%-3rem)] flex-col justify-between">
          <div className="rounded-xl border border-(--border-subtle) bg-(--surface-muted)/60 p-4 text-sm text-(--text-secondary)">
            即将开放更多设置项，当前支持退出登录。
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-(--border-subtle) bg-(--surface-card) px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-(--surface-hover)"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
