"use client";

import { useEffect, useState } from "react";
import { getAdminApi } from "../../src/api";
import { getErrorMessage } from "../../src/utils/error-message";
import styles from "../page.module.css";

interface AdminStats {
  totalUsers: number;
  totalResources: number;
  matchRate: number;
}

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
        if (!active) {
          return;
        }
        setError(getErrorMessage(loadError));
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
        <h1 className={styles.title}>统计看板</h1>
      </div>

      {loading ? <p className={styles.loading}>加载中...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && stats ? (
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>总用户数量</span>
            <span className={styles.statValue}>{stats.totalUsers}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>全平台资源总数</span>
            <span className={styles.statValue}>{stats.totalResources}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>AI 撮合匹配率</span>
            <span className={styles.statValue}>{(stats.matchRate * 100).toFixed(1)}%</span>
          </div>
        </section>
      ) : null}
    </main>
  );
}
