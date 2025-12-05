"use client";

import { useEffect, useRef, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import { useAuthStore } from "@/src/features/auth/store/useAuthStore";

type UseAuthResult = {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  supabaseReady: boolean;
};

export function useAuth(): UseAuthResult {
  const supabaseReady = hasSupabaseConfig();
  const clientRef = useRef<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);

  // 使用 Zustand store 管理状态
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    if (!supabaseReady) {
      setLoading(false);
      return;
    }

    if (!clientRef.current) {
      clientRef.current = createSupabaseBrowserClient();
    }

    const supabase = clientRef.current;
    let mounted = true;

    const loadUser = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    };

    void loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("[Auth] onAuthStateChange:", _event, session?.user?.id);
        // setUser 内部会比较 user ID，避免不必要的更新
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabaseReady, setUser, setLoading]);

  const signIn = useCallback(async () => {
    if (!supabaseReady || !clientRef.current) {
      alert("请先配置 Supabase 环境变量后再登录。");
      return;
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            window.location.pathname + window.location.search
          )}`
        : undefined;

    const { error } = await clientRef.current.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
        },
      },
    });

    if (error) {
      console.error("[Auth] Sign-in failed", error.message);
      alert("登录失败，请稍后重试。");
    }
  }, [supabaseReady]);

  const signOut = async () => {
    if (!supabaseReady || !clientRef.current) {
      return;
    }
    const { error } = await clientRef.current.auth.signOut();
    if (error) {
      console.error("[Auth] Sign-out failed", error.message);
      alert("登出失败，请稍后重试。");
    }
    //setUser(null);
  };

  return {
    user,
    loading,
    signIn,
    signOut,
    supabaseReady,
  };
}
