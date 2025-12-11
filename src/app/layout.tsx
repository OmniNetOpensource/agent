import type { Metadata } from "next";
import Script from "next/script";
import { cookies, headers } from "next/headers";
import { Nunito, Geist_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileProvider } from "@/src/shared/mobile/MobileContext";
import { ToastContainer } from "@/components/ui/toast-container";
import "./globals.css";
import "katex/dist/katex.min.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aether",
  description: "The invisible medium of knowledge.",
  icons: {
    icon: "/aether-logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    );
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const initialThemeClass = themeCookie === "dark" ? "dark" : "";

  return (
    <html
      lang="en"
      className={initialThemeClass}
      suppressHydrationWarning={true}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`
(function () {
  try {
    var cookieMatch = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    var cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    var ls = window.localStorage.getItem('theme');
    var stored = cookieTheme || ls;
    var m = window.matchMedia('(prefers-color-scheme: dark)');
    var dark = stored ? stored === 'dark' : m.matches;
    var c = document.documentElement.classList;
    dark ? c.add('dark') : c.remove('dark');
  } catch (e) {}
})();`}</Script>
        {process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="https://unpkg.com/react-scan/dist/auto.global.js"
              strategy="beforeInteractive"
            />
            <Script
              src="https://unpkg.com/react-grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
          </>
        )}
      </head>
      <body className={`${nunito.variable} ${geistMono.variable} antialiased`}>
        <MobileProvider initialIsMobile={isMobile}>
          <TooltipProvider>
            {children}
            <ToastContainer />
          </TooltipProvider>
        </MobileProvider>
      </body>
    </html>
  );
}
