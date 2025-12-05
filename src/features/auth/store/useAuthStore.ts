"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  loading: boolean;
  supabaseReady: boolean;
};

type AuthActions = {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSupabaseReady: (ready: boolean) => void;
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  loading: true,
  supabaseReady: false,

  setUser: (newUser) =>
    set((state) => {
      console.log("[AuthStore] setUser called:", {
        oldUser: state.user?.id,
        newUser: newUser?.id,
      });
      // 只在 user ID 真正变化时才更新状态，避免不必要的重渲染
      if (state.user?.id === newUser?.id) {
        return state;
      }
      return { user: newUser };
    }),

  setLoading: (loading) => set({ loading }),

  setSupabaseReady: (ready) => set({ supabaseReady: ready }),
}));
