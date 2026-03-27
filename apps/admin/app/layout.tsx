import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { AdminNav } from "./AdminNav";
import { MswProvider } from "../src/components/msw-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 资源共享平台 - 管理控制台",
  description: "全栈业务运营与审核后台"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <MswProvider />
        <div className="admin-shell">
          <AdminNav />
          {children}
        </div>
      </body>
    </html>
  );
}
