import type { Metadata } from "next";
import React from "react";
import { AuthProvider } from "../src/auth/auth-context";
import { AuthModal } from "../src/components/auth-modal";
import { MswProvider } from "../src/components/msw-provider";
import { TopNav } from "../src/components/top-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI资源共享平台 - H5",
  description: "用户端H5入口"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <MswProvider />
          <div className="app-shell">
            <TopNav />
            {children}
          </div>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
