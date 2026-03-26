"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMatchApi } from "../../../src/api";
import { EmptyState } from "../../../src/components/empty-state";
import { ErrorState } from "../../../src/components/error-state";
import { useUserStore } from "../../../src/stores/user-store";
import { getErrorMessage } from "../../../src/utils/error-message";

interface MatchItem {
  matchId: number;
  needId: number;
  resourceId: number;
  score: number;
  status: string;
}

export default function MatchListPage() {
  const token = useUserStore((state) => state.getValidToken());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<MatchItem[]>([]);
  const [message, setMessage] = useState("");
  const [needId, setNeedId] = useState("90001");

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const list = await getMatchApi().list();
      setItems(list);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadList();
  }, [token]);

  async function runMatch() {
    setMessage("");
    setError("");
    try {
      const result = await getMatchApi().run({ needId: Number(needId) });
      setMessage(`任务已创建：${result.taskId}`);
      await loadList();
    } catch (runError) {
      setError(getErrorMessage(runError));
    }
  }

  async function confirm(matchId: number) {
    setMessage("");
    setError("");
    try {
      const result = await getMatchApi().confirm(matchId);
      setMessage(`匹配 #${result.matchId} 状态更新为 ${result.status}`);
      await loadList();
    } catch (confirmError) {
      setError(getErrorMessage(confirmError));
    }
  }

  if (!token) {
    return (
      <motion.main
        className="page glass-card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="title">匹配列表</h1>
        <p className="subtitle">请先登录后再执行匹配流程。</p>
        <Link href="/auth" className="btn btn-primary">
          去登录
        </Link>
      </motion.main>
    );
  }

  return (
    <motion.main
      className="page glass-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <h1 className="title">匹配列表</h1>
      <p className="subtitle">支持发起匹配任务并确认结果。</p>

      <section className="glass-card item">
        <div className="grid grid-2">
          <label className="field">
            <span className="label">需求 ID</span>
            <input className="input" value={needId} onChange={(e) => setNeedId(e.target.value)} />
          </label>
          <div className="button-row" style={{ alignItems: "end" }}>
            <button className="btn btn-primary" type="button" onClick={() => void runMatch()}>
              发起匹配
            </button>
          </div>
        </div>
      </section>

      {message ? <p className="small">{message}</p> : null}
      {loading ? <p className="small">加载中...</p> : null}
      {error ? <ErrorState title="匹配操作失败" text={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="暂无匹配结果" text="当前没有可确认的匹配记录。" />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <section className="list">
          {items.map((item) => (
            <motion.article
              key={item.matchId}
              className="glass-card item"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="item-head">
                <h3 className="state-title">匹配 #{item.matchId}</h3>
                <span className="badge">{item.status}</span>
              </div>
              <p className="small">needId: {item.needId}</p>
              <p className="small">resourceId: {item.resourceId}</p>
              <p className="small">score: {item.score}</p>
              <div className="button-row">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => void confirm(item.matchId)}
                >
                  确认匹配
                </button>
              </div>
            </motion.article>
          ))}
        </section>
      ) : null}
    </motion.main>
  );
}
