"use client";

import { useEffect, useState } from "react";
import { getAdminApi } from "../../../src/api";
import { EmptyState } from "../../../src/components/empty-state";
import { ErrorState } from "../../../src/components/error-state";
import { getErrorMessage } from "../../../src/utils/error-message";

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
    <main className="page glass">
      <h1 className="title">团长排行</h1>
      <p className="subtitle">数据来源：`GET /admin/captain/ranking`。</p>

      {loading ? <p className="small">加载中...</p> : null}
      {error ? <ErrorState title="排行加载失败" text={error} /> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="暂无排行数据" text="当前没有可展示排行。" />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <section className="grid">
          {rows.map((item) => (
            <article key={item.captainId} className="glass card">
              <h3 className="card-title">团长 #{item.captainId}</h3>
              <p className="small">等级：{item.level}</p>
              <p className="small">评分：{item.score}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
