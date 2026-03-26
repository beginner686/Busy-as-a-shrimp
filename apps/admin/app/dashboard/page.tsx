"use client";

import { useEffect, useState } from "react";
import { getAdminApi } from "../../src/api";
import { ErrorState } from "../../src/components/error-state";
import { getErrorMessage } from "../../src/utils/error-message";

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
    <main className="page glass">
      <h1 className="title">统计看板</h1>
      <p className="subtitle">数据来源：`GET /admin/stats`。</p>

      {loading ? <p className="small">加载中...</p> : null}
      {error ? <ErrorState title="加载失败" text={error} /> : null}

      {!loading && stats ? (
        <section className="grid grid-3">
          <article className="glass card">
            <h3 className="card-title">总用户数</h3>
            <p>{stats.totalUsers}</p>
          </article>
          <article className="glass card">
            <h3 className="card-title">总资源数</h3>
            <p>{stats.totalResources}</p>
          </article>
          <article className="glass card">
            <h3 className="card-title">匹配率</h3>
            <p>{(stats.matchRate * 100).toFixed(1)}%</p>
          </article>
        </section>
      ) : null}
    </main>
  );
}
