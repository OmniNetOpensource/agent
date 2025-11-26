"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, LogOut } from "lucide-react";

type UserMenuProps = {
  user: User;
  onSignOut: () => Promise<void> | void;
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

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) px-3 py-2 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <span className="flex items-center gap-3 min-w-0">
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
          <span className="flex flex-col min-w-0 text-left">
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
        <ChevronDown
          className={`h-4 w-4 text-(--text-tertiary) transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[110%] z-20 w-full min-w-[220px] rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2 shadow-lg">
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await onSignOut();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:bg-(--surface-hover) hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
