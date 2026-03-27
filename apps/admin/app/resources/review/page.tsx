"use client";

import { useEffect, useState } from "react";
import { getAdminApi } from "../../../src/api";
import { EmptyState } from "../../../src/components/empty-state";
import { getErrorMessage } from "../../../src/utils/error-message";
import styles from "../../page.module.css";

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
      setMessage(`资源 #${result.resourceId} 操作成功：已更新为 ${result.status}`);
      await loadResources();
    } catch (reviewError) {
      setError(getErrorMessage(reviewError));
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>资源分发审核</h1>
      </div>

      {message ? <p className={styles.message}>{message}</p> : null}
      {loading ? <p className={styles.loading}>加载中...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && resources.length === 0 ? (
        <EmptyState title="暂无待审核资源" text="当前全网分发频道暂无待处理的资源审核请求。" />
      ) : null}

      {!loading && !error && resources.length > 0 ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>待审核队列</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>资源编号</th>
                  <th>当前状态</th>
                  <th>管理操作</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((item) => (
                  <tr key={item.resourceId}>
                    <td>#{item.resourceId}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.pending}`}>
                        {item.reviewStatus}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionInline}>
                        <button
                          style={{ borderColor: "#00c778", background: "rgba(0,199,120,0.15)" }}
                          onClick={() => void review(item.resourceId, "approve")}
                        >
                          审核通过
                        </button>
                        <button
                          style={{ borderColor: "#ff566f", background: "rgba(255,86,111,0.15)" }}
                          onClick={() => void review(item.resourceId, "reject")}
                        >
                          拒绝退回
                        </button>
                      </div>
                    </td>
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
