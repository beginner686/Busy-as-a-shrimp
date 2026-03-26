import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { MswProvider } from "../src/components/msw-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resource Platform - Admin Console",
  description: "Operations and moderation console"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <MswProvider />
        <div className="admin-shell">
          <nav className="admin-nav glass">
            <Link className="nav-item" href="/">
              首页
            </Link>
            <Link className="nav-item" href="/dashboard">
              统计看板
            </Link>
            <Link className="nav-item" href="/users">
              用户列表
            </Link>
            <Link className="nav-item" href="/resources/review">
              资源审核
            </Link>
            <Link className="nav-item" href="/captain/ranking">
              团长排行
            </Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
