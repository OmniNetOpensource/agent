"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Settings } from "lucide-react";
import { SettingsModal } from "./SettingsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const avatarUrl = getAvatarUrl(user);
  const displayName = getDisplayName(user);

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSignOut = async () => {
    await onSignOut();
    setSettingsOpen(false);
  };

  return (
    <div className="relative w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1 text-sm transition-colors hover:bg-accent"
          >
            <span className="flex min-w-0 items-center gap-2 shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-sm font-semibold">
                  {displayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className={`flex min-w-0 flex-col text-left transition-all duration-300 ${
                  isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                }`}
              >
                <span className="truncate font-semibold text-foreground">
                  {displayName}
                </span>
                {user.email && (
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                )}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-[220px]">
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-xs font-semibold">
                {displayName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </span>
              </div>
              {user.email && (
                <div className="text-xs leading-tight text-muted-foreground">
                  {user.email}
                </div>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleOpenSettings}>
            <Settings className="h-4 w-4" />
            设置
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsModal
        open={settingsOpen}
        onClose={handleCloseSettings}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
