import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { MswProvider } from "../src/components/msw-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI资源共享平台 - H5",
  description: "用户端H5入口"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <MswProvider />
        <div className="app-shell">
          <nav className="top-nav glass-card">
            <Link href="/" className="nav-link">
              首页
            </Link>
            <Link href="/login" className="nav-link">
              登录
            </Link>
            <Link href="/profile" className="nav-link">
              个人资料
            </Link>
            <Link href="/resource/new" className="nav-link">
              新建资源
            </Link>
            <Link href="/resource/list" className="nav-link">
              资源列表
            </Link>
            <Link href="/match/list" className="nav-link">
              匹配列表
            </Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
