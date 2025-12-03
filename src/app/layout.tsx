import type { Metadata } from "next";
import Script from "next/script";
import { Nunito, Geist_Mono } from "next/font/google";
import { Header } from "@/src/features/chat/components/Header";
import Sidebar from "@/src/features/sidebar/components/Sidebar";

import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileProvider } from "@/src/shared/mobile/MobileProvider";
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
        <script src="https://unpkg.com/react-scan/dist/auto.global.js" async />
        <Script
          src="https://unpkg.com/react-grab/dist/index.global.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
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
            <div className="flex h-screen w-screen bg-background text-foreground">
              <Sidebar />
              <div className="relative flex-1 overflow-hidden flex flex-col">
                <Header />
                <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
              </div>
            </div>
          </TooltipProvider>
        </MobileProvider>
      </body>
    </html>
  );
}
