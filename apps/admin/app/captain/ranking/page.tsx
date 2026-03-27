"use client";

import { useEffect, useState } from "react";
import { getAdminApi } from "../../../src/api";
import { EmptyState } from "../../../src/components/empty-state";
import { getErrorMessage } from "../../../src/utils/error-message";
import styles from "../../page.module.css";

interface CaptainRank {
  captainId: number;
  level: string;
  score: number;
}

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
        <h1 className={styles.title}>团长领袖排行</h1>
      </div>

      {loading ? <p className={styles.loading}>加载中...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="暂无排行数据" text="当前没有可展示领袖排行。" />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>王牌团长贡献榜</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>排名标识</th>
                  <th>当前等级</th>
                  <th>贡献积分</th>
                  <th>趋势</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item, index) => (
                  <tr key={item.captainId}>
                    <td>#{item.captainId} (Top {index + 1})</td>
                    <td>
                      <span className={`${styles.badge} ${styles.active}`}>
                        {item.level}
                      </span>
                    </td>
                    <td style={{ fontWeight: "bold", color: "#8de6ff" }}>{item.score}</td>
                    <td style={{ color: "#55ffb5" }}>↑ 稳定上升</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </main>
  );
}
