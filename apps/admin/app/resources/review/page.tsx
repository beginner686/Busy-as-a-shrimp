"use client";

import { useEffect, useState } from "react";
import { getAdminApi } from "../../../src/api";
import { EmptyState } from "../../../src/components/empty-state";
import { ErrorState } from "../../../src/components/error-state";
import { getErrorMessage } from "../../../src/utils/error-message";

interface AdminResource {
  resourceId: number;
  reviewStatus: string;
}

export default function ResourceReviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resources, setResources] = useState<AdminResource[]>([]);

  async function loadResources() {
    setLoading(true);
    setError("");
    try {
      const result = await getAdminApi().resources();
      setResources(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResources();
  }, []);

  async function review(resourceId: number, decision: "approve" | "reject") {
    setMessage("");
    setError("");
    try {
      const result = await getAdminApi().reviewResource(resourceId, decision);
      setMessage(`资源 #${result.resourceId} 已更新为 ${result.status}`);
      await loadResources();
    } catch (reviewError) {
      setError(getErrorMessage(reviewError));
    }
  }

  return (
    <main className="page glass">
      <h1 className="title">资源审核</h1>
      <p className="subtitle">审核动作：`PUT /admin/resources/:id`。</p>

      {message ? <p className="small">{message}</p> : null}
      {loading ? <p className="small">加载中...</p> : null}
      {error ? <ErrorState title="审核失败" text={error} /> : null}

      {!loading && !error && resources.length === 0 ? (
        <EmptyState title="暂无待审核资源" text="当前没有待处理记录。" />
      ) : null}

      {!loading && !error && resources.length > 0 ? (
        <section className="grid">
          {resources.map((item) => (
            <article key={item.resourceId} className="glass card">
              <h3 className="card-title">资源 #{item.resourceId}</h3>
              <p className="small">当前状态：{item.reviewStatus}</p>
              <div className="row">
                <button
                  className="btn"
                  type="button"
                  onClick={() => void review(item.resourceId, "approve")}
                >
                  通过
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => void review(item.resourceId, "reject")}
                >
                  驳回
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
