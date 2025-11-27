"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, Settings } from "lucide-react";
import { SettingsModal } from "./SettingsModal";

type UserMenuProps = {
  user: User;
  onSignOut: () => Promise<void> | void;
  isCollapsed?: boolean;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const avatarUrl = getAvatarUrl(user);
  const displayName = getDisplayName(user);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return (
    <div className={`relative w-full`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) text-sm shadow-sm transition-colors hover:bg-(--surface-hover) cursor-pointer 
        w-full justify-between px-3 py-2
          `}
      >
        <span className="flex min-w-0 items-center gap-3 shrink-0">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-(--surface-muted) text-sm font-semibold text-foreground ring-1 ring-(--border-subtle)">
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

      {open && (
        <div
          className={`absolute z-20 min-w-[220px] rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2 shadow-lg ${
            isCollapsed
              ? "left-1/2 bottom-[110%] w-max -translate-x-1/2"
              : "right-0 bottom-[110%] w-full"
          }`}
        >
          <button
            type="button"
            onClick={handleOpenSettings}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:bg-(--surface-hover) hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            设置
          </button>
        </div>
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={handleCloseSettings}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
