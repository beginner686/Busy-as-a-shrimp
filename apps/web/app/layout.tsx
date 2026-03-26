import type { Metadata } from "next";
import React from "react";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { MswProvider } from "../src/components/msw-provider";
import { TopNav } from "../src/components/top-nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AI资源共享平台 - H5",
  description: "用户端H5入口"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={cn("font-sans", inter.variable)}>
      <body className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 text-slate-900">
        <MswProvider>
          <div className="mx-auto min-h-screen max-w-6xl px-4 py-4 md:px-6 md:py-5">
            <TopNav />
            <main className="pb-8">{children}</main>
          </div>
          <Toaster />
        </MswProvider>
      </body>
    </html>
  );
}
