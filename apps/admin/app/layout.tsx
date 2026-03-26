import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "AI Resource Platform - Admin Console",
  description: "Operations and moderation console"
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
