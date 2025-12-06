import type { Metadata } from "next";
import Script from "next/script";
import { Nunito, Geist_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileProvider } from "@/src/shared/mobile/MobileProvider";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
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
        <Script id="theme-init" strategy="beforeInteractive">{`
(function () {
  try {
    var ls = window.localStorage.getItem('theme');
    var m = window.matchMedia('(prefers-color-scheme: dark)');
    var dark = ls ? ls === 'dark' : m.matches;
    var c = document.documentElement.classList;
    dark ? c.add('dark') : c.remove('dark');
  } catch (e) {}
})();`}</Script>
        <MobileProvider>
          <TooltipProvider>
            {children}
            <ToastContainer />
          </TooltipProvider>
        </MobileProvider>
      </body>
    </html>
  );
}
