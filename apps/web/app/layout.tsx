import type { Metadata } from "next";
import React from "react";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { MswProvider } from "../src/components/msw-provider";
import { QueryProvider } from "../src/components/providers/query-provider";
import { TopNav } from "../src/components/top-nav";
import { PageProgressBar } from "../src/components/page-progress-bar";
import "./globals.css";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AI资源共享平台 - H5",
  description: "用户端H5入口"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={cn("font-sans", inter.variable)}>
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased selection:bg-cyan-500/30">
        <MswProvider>
          <QueryProvider>
            <Suspense fallback={null}>
              <PageProgressBar />
            </Suspense>
            <div className="mx-auto min-h-screen max-w-6xl px-4 py-4 md:px-6 md:py-5">
              <TopNav />
              <main className="pb-8">{children}</main>
            </div>
            <Toaster />
          </QueryProvider>
        </MswProvider>
      </body>
    </html>
  );
}
