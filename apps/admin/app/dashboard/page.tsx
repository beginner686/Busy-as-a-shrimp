"use client";

import { useEffect, useState } from "react";

import { getAdminApi } from "../../src/api";
import type { AdminStats } from "../../src/api/admin-api";
import styles from "../page.module.css";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getAdminApi().stats();
        if (active) {
          setStats(result);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>Operations summary for users, resources, and captains.</p>
        </div>
      </div>

      {loading ? <p className={styles.loading}>Loading dashboard data...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Total users</span>
          <strong className={styles.statValue}>{stats?.totalUsers ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Active users</span>
          <strong className={styles.statValue}>{stats?.activeUsers ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Total resources</span>
          <strong className={styles.statValue}>{stats?.totalResources ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Pending review</span>
          <strong className={styles.statValue}>{stats?.pendingResources ?? "-"}</strong>
        </article>
      </section>

      {!loading && stats ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Platform health</h2>
          </div>
          <p className={styles.message}>
            Current match rate: {stats.matchRate}% | Active captains: {stats.activeCaptains} |
            Announcements: {stats.announcementCount}
          </p>
        </section>
      ) : null}
    </main>
  );
}
