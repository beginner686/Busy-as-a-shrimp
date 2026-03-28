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
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: "#fff",
            marginRight: "24px",
            cursor: "pointer"
          }}
        >
          Busy as a Shrimp Admin
        </Link>
        <Link className={`nav-item ${pathname === "/" ? "active" : ""}`} href="/">
          Home
        </Link>
        <Link className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`} href="/dashboard">
          Dashboard
        </Link>
        <Link className={`nav-item ${pathname === "/users" ? "active" : ""}`} href="/users">
          Users
        </Link>
        <Link
          className={`nav-item ${pathname === "/resources/review" ? "active" : ""}`}
          href="/resources/review"
        >
          Resource Review
        </Link>
        <Link
          className={`nav-item ${pathname === "/captain/ranking" ? "active" : ""}`}
          href="/captain/ranking"
        >
          Captain Ranking
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ color: "#8de6ff", fontSize: "14px" }}>
          Admin: {profile?.username ?? "admin"}
        </span>
        <button
          onClick={handleLogout}
          style={{
            height: "34px",
            border: "1px solid rgba(255,123,145,0.7)",
            borderRadius: "8px",
            padding: "0 14px",
            color: "#ffd6df",
            background: "rgba(255,92,123,0.16)",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 500
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
