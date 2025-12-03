"use client";

import { useEffect } from "react";
import { useMobileStore } from "./useMobileStore";

const MOBILE_BREAKPOINT = "(max-width: 767px)";

export function MobileProvider({ children }: { children: React.ReactNode }) {
  const setIsMobile = useMobileStore((state) => state.setIsMobile);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);

    // 初始设置
    setIsMobile(mediaQuery.matches);

    // 监听变化
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [setIsMobile]);

  return <>{children}</>;
}

