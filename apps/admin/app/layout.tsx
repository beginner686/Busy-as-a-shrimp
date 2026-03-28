import type { Metadata } from "next";
import React from "react";
import { AdminNav } from "./AdminNav";
import { MswProvider } from "../src/components/msw-provider";
import { QueryProvider } from "../src/components/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Busy as a Shrimp Admin",
  description: "Admin console for operations, resource review, and captain ranking."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <MswProvider />
        <QueryProvider>
          <div className="admin-shell">
            <AdminNav />
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
