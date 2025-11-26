"use client";

import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

type LoginButtonProps = {
  isCollapsed?: boolean;
};

export function LoginButton({ isCollapsed }: LoginButtonProps) {
  const { signIn, loading, supabaseReady } = useAuth();
  const buttonDisabled = loading || !supabaseReady;

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={buttonDisabled}
      className={`group inline-flex items-center justify-center gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-card) text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${
        isCollapsed ? "h-10 w-10 p-0" : "w-full px-4 py-3"
      }`}
    >
      <span
        className={`relative flex items-center justify-center rounded-lg bg-(--surface-muted) text-foreground ring-1 ring-(--border-subtle) transition-transform group-hover:scale-105 ${
          isCollapsed ? "h-6 w-6" : "h-6 w-6"
        }`}
      >
        <span className="text-xs font-bold">G</span>
      </span>
      {!isCollapsed && (
        <span className="flex items-center gap-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              正在登录...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              使用 Google 登录
            </>
          )}
        </span>
      )}
    </button>
  );
}
