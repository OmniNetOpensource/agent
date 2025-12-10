"use client";

import { createContext, useContext, useEffect, useState } from "react";

const MOBILE_BREAKPOINT = "(max-width: 767px)";

type MobileContextValue = {
  isMobile: boolean;
};

const MobileContext = createContext<MobileContextValue>({ isMobile: false });

export function MobileProvider({
  children,
  initialIsMobile = false,
}: {
  children: React.ReactNode;
  initialIsMobile?: boolean;
}) {
  // 使用服务端传入的值作为初始状态
  const [isMobile, setIsMobile] = useState(initialIsMobile);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);

    // 首次挂载时校准（处理 UA 误判）
    // 使用 requestAnimationFrame 避免同步 setState 警告
    const rafId = requestAnimationFrame(() => {
      if (mediaQuery.matches !== isMobile) {
        setIsMobile(mediaQuery.matches);
      }
    });

    // 监听后续窗口变化
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => {
      cancelAnimationFrame(rafId);
      mediaQuery.removeEventListener("change", handler);
    };
  }, []);

  return (
    <MobileContext.Provider value={{ isMobile }}>
      {children}
    </MobileContext.Provider>
  );
}

export function useIsMobile() {
  return useContext(MobileContext).isMobile;
}
