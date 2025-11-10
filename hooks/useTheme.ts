"use client";

import { useCallback, useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const applyHtmlClass = (theme: ResolvedTheme) => {
  if (typeof document === "undefined") return;
  const classList = document.documentElement.classList;
  if (theme === "dark") {
    classList.add("dark");
  } else {
    classList.remove("dark");
  }
};

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
};

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return "system";
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return getSystemTheme();
  });

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);

    if (typeof window === "undefined") {
      if (next === "light" || next === "dark") {
        setResolvedTheme(next);
        applyHtmlClass(next);
      }
      return;
    }

    if (next === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      const systemTheme = getSystemTheme();
      setResolvedTheme(systemTheme);
      applyHtmlClass(systemTheme);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      setResolvedTheme(next);
      applyHtmlClass(next);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setPreference(next);
  }, [resolvedTheme, setPreference]);

  // 初始化时应用主题到HTML
  useEffect(() => {
    applyHtmlClass(resolvedTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (preference !== "system") return;

    const media = window.matchMedia(DARK_QUERY);
    const syncTheme = (matches: boolean) => {
      const next = matches ? "dark" : "light";
      setResolvedTheme(next);
      applyHtmlClass(next);
    };

    syncTheme(media.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncTheme(event.matches);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [preference]);

  return { preference, resolvedTheme, toggleTheme, setPreference } as const;
}
