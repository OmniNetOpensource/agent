"use client";

import { useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { BarChart3, Loader2, LogIn, Settings, User2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { SettingsModal } from "./SettingsModal";

type ProfileMenuProps = {
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

export function ProfileMenu({ isCollapsed = false }: ProfileMenuProps) {
  const { user, signIn, signOut, loading, supabaseReady } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const displayName = user ? getDisplayName(user) : "Guest";
  const avatarUrl = user ? getAvatarUrl(user) : undefined;
  const subtitle = user?.email || "游客模式";
  const buttonDisabled = loading || !supabaseReady;

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setSettingsOpen(false);
  };

  const handleSignIn = async () => {
    if (buttonDisabled) return;
    await signIn();
  };

  return (
    <div
      className="py-4 transition-all duration-500"
      style={{
        paddingLeft: isCollapsed ? 4 : 8,
        paddingRight: isCollapsed ? 4 : 8,
      }}
    >
      <div className="flex">
        <div
          className="relative transition-all duration-500 mx-auto"
          style={{ width: isCollapsed ? "auto" : "100%" }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-3 text-sm transition-all duration-500 hover:bg-accent hover:text-accent-foreground"
                style={{
                  width: isCollapsed ? 40 : "100%",
                  height: isCollapsed ? 40 : "auto",
                  padding: isCollapsed ? 4 : "4px 8px",
                  borderRadius: isCollapsed ? 6 : 6,
                  justifyContent: isCollapsed ? "center" : "flex-start",
                }}
              >
                <span
                  className={`flex min-w-0 items-center shrink-0 transition-all duration-500 ${
                    isCollapsed ? "gap-0" : "gap-2"
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    {user ? (
                      <>
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback className="text-sm font-semibold">
                          {displayName.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback className="text-sm font-semibold">
                        <User2 className="h-4 w-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span
                    className="flex min-w-0 flex-col text-left transition-all duration-500 overflow-hidden"
                    style={{
                      width: isCollapsed ? 0 : "auto",
                      opacity: isCollapsed ? 0 : 1,
                    }}
                  >
                    <span className="truncate font-semibold text-foreground">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {subtitle}
                    </span>
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="min-w-[220px]"
            >
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <Avatar className="h-5 w-5">
                  {user ? (
                    <>
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="text-xs font-semibold">
                        {displayName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="text-xs font-semibold">
                      <User2 className="h-3 w-3" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </span>
                  </div>
                  <div className="text-xs leading-tight text-muted-foreground">
                    {user ? user.email : "游客模式，登录后可同步聊天记录"}
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleOpenSettings}>
                <Settings className="h-4 w-4" />
                设置
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard / 数据面板
                </Link>
              </DropdownMenuItem>

              {!user && (
                <DropdownMenuItem
                  onClick={handleSignIn}
                  disabled={buttonDisabled}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
                    <span className="text-xs font-bold">G</span>
                  </span>
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在登录...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <LogIn className="h-4 w-4" />
                      使用 Google 登录
                    </span>
                  )}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <SettingsModal
            open={settingsOpen}
            onClose={handleCloseSettings}
            hasUser={!!user}
            onSignOut={user ? handleSignOut : undefined}
            onSignIn={!user ? signIn : undefined}
            authLoading={loading}
            supabaseReady={supabaseReady}
          />
        </div>
      </div>
    </div>
  );
}
