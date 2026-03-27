"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { clearAdminSession, getAdminProfile, type AdminSessionProfile } from "../lib/auth";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AdminSessionProfile | null>(null);

  useEffect(() => {
    if (pathname !== "/login") {
      setProfile(getAdminProfile());
    }
  }, [pathname]);

  if (pathname === "/login") {
    return null;
  }

  function handleLogout() {
    clearAdminSession();
    router.replace("/login");
  }

  return (
    <nav className="admin-nav glass" style={{ justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <Link 
          href="/" 
          style={{ fontSize: "18px", fontWeight: "bold", color: "#fff", marginRight: "24px", cursor: "pointer" }}
        >
          🦐 虾忙管理控制台
        </Link>
        <Link className={`nav-item ${pathname === "/" ? "active" : ""}`} href="/">首页</Link>
        <Link className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`} href="/dashboard">统计看板</Link>
        <Link className={`nav-item ${pathname === "/users" ? "active" : ""}`} href="/users">用户列表</Link>
        <Link className={`nav-item ${pathname === "/resources/review" ? "active" : ""}`} href="/resources/review">资源审核</Link>
        <Link className={`nav-item ${pathname === "/captain/ranking" ? "active" : ""}`} href="/captain/ranking">团长排行</Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ color: "#8de6ff", fontSize: "14px" }}>
          管理员：{profile?.username ?? "admin"}
        </span>
        <button 
          onClick={handleLogout}
          style={{
            height: "34px", border: "1px solid rgba(255,123,145,0.7)", borderRadius: "8px", 
            padding: "0 14px", color: "#ffd6df", background: "rgba(255,92,123,0.16)", cursor: "pointer",
            fontSize: "13px", fontWeight: 500
          }}
        >
          退出登录
        </button>
      </div>
    </nav>
  );
}
