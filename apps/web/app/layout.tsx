import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "AI资源共享平台 - H5",
  description: "用户端H5入口"
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

