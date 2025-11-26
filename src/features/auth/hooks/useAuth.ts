"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => supabaseReady);

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    if (!clientRef.current) {
      clientRef.current = createSupabaseBrowserClient();
    }

    const supabase = clientRef.current;
    let mounted = true;

    const loadUser = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (mounted) {
        if (error) {
          console.error("[Auth] Failed to load user", error.message);
        }
        setUser(data.user ?? null);
        setLoading(false);
      }
    };

    void loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabaseReady]);

  const signIn = async () => {
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
  };

  const signOut = async () => {
    if (!supabaseReady || !clientRef.current) {
      return;
    }
    const { error } = await clientRef.current.auth.signOut();
    if (error) {
      console.error("[Auth] Sign-out failed", error.message);
      alert("登出失败，请稍后重试。");
    }
  };

  return {
    user,
    loading,
    signIn,
    signOut,
    supabaseReady,
  };
}
