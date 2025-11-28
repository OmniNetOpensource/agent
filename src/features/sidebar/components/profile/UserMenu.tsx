"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { Settings } from "lucide-react";
import { SettingsModal } from "./SettingsModal";

type UserMenuProps = {
  user: User;
  onSignOut: () => Promise<void> | void;
  isCollapsed?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

const getAvatarUrl = (user: User) =>
  (user.user_metadata as Record<string, unknown>)?.avatar_url as
    | string
    | undefined;

const getDisplayName = (user: User) =>
  ((user.user_metadata as Record<string, unknown>)?.full_name as
    | string
    | undefined) ||
  user.email ||
  "用户";

export function UserMenu({
  user,
  onSignOut,
  isCollapsed = false,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const avatarUrl = getAvatarUrl(user);
  const displayName = getDisplayName(user);

  const updateMenuPosition = () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    setMenuPosition({
      top: rect.top,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        (containerRef.current &&
          containerRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target))
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    updateMenuPosition();

    const handleResize = () => {
      updateMenuPosition();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  const handleToggleMenu = () => {
    setOpen((previous) => {
      const next = !previous;
      if (next) {
        updateMenuPosition();
      }
      return next;
    });
  };

  const handleOpenSettings = () => {
    setOpen(false);
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSignOut = async () => {
    await onSignOut();
    setSettingsOpen(false);
    setOpen(false);
  };

  const menu =
    open && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[var(--z-popover)] min-w-[220px] rounded-xl border border-(--border-subtle) bg-(--surface-card) p-1.5 shadow-lg"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              transform: "translateY(-100%) translateY(-0.5rem)",
            }}
          >
            <div className="flex items-center gap-1.5 px-1 py-1.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--surface-muted) ring-1 ring-(--border-subtle)">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-5 w-5 shrink-0 object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                </div>
                {user.email && (
                  <div className="text-xs leading-tight text-(--text-tertiary) mb-0.5">
                    {user.email}
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-(--border-subtle) mx-4 my-1" />

            <button
              type="button"
              onClick={handleOpenSettings}
              className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:bg-(--surface-hover) hover:text-foreground"
            >
              <div className="flex h-5 w-5 items-center justify-center">
                <Settings className="h-5 w-5" />
              </div>
              设置
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative w-full`} ref={containerRef}>
      <button
        type="button"
        onClick={handleToggleMenu}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1 text-sm transition-colors hover:bg-(--surface-hover)"
      >
        <span className="flex min-w-0 items-center gap-2 shrink-0">
          <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-(--surface-muted) text-sm font-semibold text-foreground ring-1 ring-(--border-subtle)">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              displayName.slice(0, 1).toUpperCase()
            )}
          </span>
          <span
            className={`flex min-w-0 flex-col text-left transition-all duration-300 ${
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            }`}
          >
            <span className="truncate font-semibold text-foreground">
              {displayName}
            </span>
            {user.email && (
              <span className="truncate text-xs text-(--text-tertiary)">
                {user.email}
              </span>
            )}
          </span>
        </span>
      </button>

      {menu}

      <SettingsModal
        open={settingsOpen}
        onClose={handleCloseSettings}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
