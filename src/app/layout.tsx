import type { Metadata } from "next";
import Script from "next/script";
import { cookies, headers } from "next/headers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Outfit } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ResponsiveProvider } from "@/src/shared/responsive/ResponsiveContext";
import { detectDeviceTypeFromUA } from "@/src/shared/responsive/server";
import { ToastContainer } from "@/components/ui/toast-container";
import "./globals.css";
import "katex/dist/katex.min.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});


export const metadata: Metadata = {
  title: "Aether",
  description: "The invisible medium of knowledge.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aether",
  },
  icons: {
    icon: "/aether-logo.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const deviceType = detectDeviceTypeFromUA(userAgent);
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const initialThemeClass = themeCookie === "dark" ? "dark" : "";
  const htmlClassName = initialThemeClass
    ? `${initialThemeClass} ${outfit.variable}`
    : outfit.variable;

  return (
    <html
      lang="en"
      className={htmlClassName}
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
      <body className="antialiased">
        <ResponsiveProvider initialDeviceType={deviceType}>
          <TooltipProvider>
            {children}
            <ToastContainer />
          </TooltipProvider>
        </ResponsiveProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
