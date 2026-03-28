"use client";

import { useEffect, useState } from "react";

import { getAdminApi } from "../../../src/api";
import type { CaptainRank } from "../../../src/api/admin-api";
import { EmptyState } from "../../../src/components/empty-state";
import styles from "../../page.module.css";

export default function CaptainRankingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<CaptainRank[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getAdminApi().captainRanking();
        if (active) {
          setRows(result);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load ranking.");
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
          <h1 className={styles.title}>Captain Ranking</h1>
          <p className={styles.subtitle}>Track top captain performance and commission levels.</p>
        </div>
      </div>

      {loading ? <p className={styles.loading}>Loading captain ranking...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No ranking data" text="Captain ranking data is not available yet." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Top captains</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Captain</th>
                  <th>Level</th>
                  <th>Score</th>
                  <th>Monthly invites</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.captainId}>
                    <td>
                      {item.name} (#{item.captainId})
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.active}`}>{item.level}</span>
                    </td>
                    <td>{item.score}</td>
                    <td>{item.monthInvites}</td>
                    <td>{Math.round(item.commissionRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
