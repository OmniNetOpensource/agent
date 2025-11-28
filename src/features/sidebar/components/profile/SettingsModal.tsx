"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { flushSync } from "react-dom";
import { LogOut, Moon, Sun, X } from "lucide-react";

import { useTheme } from "@/src/features/theme/hooks/useTheme";

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
  const { theme, toggleTheme } = useTheme();

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

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (
      !(document as Document).startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      toggleTheme();
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    const transition = (document as Document).startViewTransition(() => {
      flushSync(() => {
        toggleTheme();
      });
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 300,
          easing: "ease-in",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[var(--z-modal-backdrop)] flex items-center justify-center bg-black/35 backdrop-blur-md"
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
          <div className="space-y-6">
            {/* Appearance Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-(--text-secondary)">
                外观
              </h3>
              <div className="flex items-center justify-between rounded-xl border border-(--border-subtle) bg-(--surface-muted)/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--surface-base) text-foreground shadow-sm ring-1 ring-(--border-subtle)">
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      深色模式
                    </span>
                    <span className="text-xs text-(--text-tertiary)">
                      {theme === "dark" ? "已开启" : "已关闭"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleThemeToggle}
                  role="switch"
                  aria-checked={theme === "dark"}
                  className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    theme === "dark"
                      ? "bg-(--text-primary)"
                      : "bg-(--border-strong)"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      theme === "dark" ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
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
