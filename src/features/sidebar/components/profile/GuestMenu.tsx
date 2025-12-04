"use client";

import { useState } from "react";
import { Loader2, LogIn, Settings, User2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { SettingsModal } from "./SettingsModal";

type GuestMenuProps = {
  isCollapsed?: boolean;
};

export function GuestMenu({ isCollapsed = false }: GuestMenuProps) {
  const { signIn, loading, supabaseReady } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const buttonDisabled = loading || !supabaseReady;

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSignIn = async () => {
    if (buttonDisabled) return;
    await signIn();
  };

  return (
    <div 
      className="relative transition-all duration-500"
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
            <span className="flex min-w-0 items-center gap-2 shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm font-semibold">
                  <User2 className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span
                className="flex min-w-0 flex-col text-left transition-all duration-500 overflow-hidden"
                style={{ 
                  width: isCollapsed ? 0 : "auto", 
                  opacity: isCollapsed ? 0 : 1 
                }}
              >
                <span className="truncate font-semibold text-foreground">
                  Guest
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  游客模式
                </span>
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-[220px]">
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs font-semibold">
                <User2 className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="truncate text-sm font-medium text-foreground">
                  Guest
                </span>
              </div>
              <div className="text-xs leading-tight text-muted-foreground">
                游客模式，登录后可同步聊天记录
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleOpenSettings}>
            <Settings className="h-4 w-4" />
            设置
          </DropdownMenuItem>

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
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsModal
        open={settingsOpen}
        onClose={handleCloseSettings}
        hasUser={false}
        onSignIn={signIn}
        authLoading={loading}
        supabaseReady={supabaseReady}
      />
    </div>
  );
}
