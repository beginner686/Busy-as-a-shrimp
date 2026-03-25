import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "AI资源共享平台 - 管理后台",
  description: "审核与运营后台"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "PingFang SC, Microsoft YaHei, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}

