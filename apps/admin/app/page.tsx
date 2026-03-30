"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AdminStats } from "../src/api/admin-api";
import {
  clearAdminSession,
  getAdminProfile,
  getAdminToken,
  type AdminSessionProfile
} from "../lib/auth";
import styles from "./page.module.css";

const QUICK_LINKS = [
  { href: "/dashboard", title: "Dashboard", description: "See platform-wide metrics." },
  { href: "/users", title: "Users", description: "Inspect users and account status." },
  {
    href: "/resources/review",
    title: "Resource review",
    description: "Process pending resource submissions."
  },
  {
    href: "/captain/ranking",
    title: "Captain ranking",
    description: "Check captain scores and commission tiers."
  }
];

export default function AdminHomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [, setProfile] = useState<AdminSessionProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [stats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const savedToken = getAdminToken();
    if (!savedToken) {
      router.replace("/login");
      return;
    }

    setProfile(getAdminProfile());
    setSessionReady(true);
    setLoading(false);
  }, [router]);

  if (!sessionReady) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>正在为您验证管理员鉴权核心...</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div
        className={styles.headerRow}
        style={{ justifyContent: "flex-end", marginBottom: "12px" }}
      >
        <div className={styles.topActions}>
          <button type="button" className={styles.refreshBtn} onClick={() => router.refresh()}>
            Refresh shell
          </button>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={() => {
              clearAdminSession();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {loading ? <p className={styles.loading}>Loading admin overview...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Total users</span>
          <strong className={strongName(styles.statValue)}>{stats?.totalUsers ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Pending resources</span>
          <strong className={styles.statValue}>{stats?.pendingResources ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Active captains</span>
          <strong className={styles.statValue}>{stats?.activeCaptains ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Match rate</span>
          <strong className={styles.statValue}>{stats ? `${stats.matchRate}%` : "-"}</strong>
        </article>
      </section>

      <section className={styles.panelSplit}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Quick actions</h2>
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid rgba(128, 145, 255, 0.24)",
                  borderRadius: "14px",
                  padding: "14px",
                  background: "rgba(7, 12, 35, 0.58)"
                }}
              >
                <strong style={{ display: "block", marginBottom: "6px" }}>{item.title}</strong>
                <span style={{ color: "#9faee7", fontSize: "13px" }}>{item.description}</span>
              </Link>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Snapshot</h2>
          </div>
          <p className={styles.message}>
            Active users: {stats?.activeUsers ?? "-"} | Total resources:{" "}
            {stats?.totalResources ?? "-"}
          </p>
          <p className={styles.message}>
            Announcements: {stats?.announcementCount ?? "-"} | Review queue:{" "}
            {stats?.pendingResources ?? "-"}
          </p>
        </article>
      </section>
    </main>
  );
}

function strongName(className: string) {
  return className;
}
