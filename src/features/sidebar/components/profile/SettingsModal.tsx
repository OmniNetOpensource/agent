"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { LogIn, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "@/src/features/theme/hooks/useTheme";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, signIn, signOut, loading, supabaseReady } = useAuth();

  const hasUser = !!user;
  const authLoading = loading;

  const handleSignOut = async () => {
    if (!hasUser) return;
    await signOut();
    setOpen(false);
  };

  const handleSignIn = async () => {
    if (authLoading || !supabaseReady) return;
    await signIn();
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

  return (
    <>
      <DropdownMenuItem onClick={() => setOpen(true)}>
        <Settings className="h-4 w-4" />
        设置
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[50vh] w-[50vw] min-w-[320px] max-w-4xl">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
          </DialogHeader>

          <div className="flex h-[calc(100%-3rem)] flex-col justify-between">
            <div className="space-y-6">
              {/* Appearance Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  外观
                </h3>
                <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-foreground shadow-sm ring-1 ring-border">
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
                      <span className="text-xs text-muted-foreground">
                        {theme === "dark" ? "已开启" : "已关闭"}
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onClick={handleThemeToggle}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {!hasUser && (
                <Button
                  variant="outline"
                  onClick={handleSignIn}
                  disabled={authLoading || !supabaseReady}
                  className="self-start"
                >
                  {authLoading ? (
                    <>
                      <LogIn className="h-4 w-4 animate-spin" />
                      正在登录...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      使用 Google 登录
                    </>
                  )}
                </Button>
              )}

              {hasUser && (
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="self-start"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
