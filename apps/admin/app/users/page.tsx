"use client";

import { useEffect, useState } from "react";
import { getAdminApi } from "../../src/api";
import { EmptyState } from "../../src/components/empty-state";
import { getErrorMessage } from "../../src/utils/error-message";
import styles from "../page.module.css";

interface AdminUser {
  userId: number;
  status: string;
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getAdminApi().users();
        if (active) {
          setUsers(result);
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
        <h1 className={styles.title}>用户名册</h1>
      </div>

      {loading ? <p className={styles.loading}>加载中...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && users.length === 0 ? (
        <EmptyState title="暂无用户" text="当前系统内尚无注册用户活跃记录。" />
      ) : null}

      {!loading && !error && users.length > 0 ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>活跃用户列表</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>用户编号</th>
                  <th>当前状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.userId}>
                    <td>#{item.userId}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[item.status.toLowerCase()] || ""}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionInline}>
                        <button>查看详情</button>
                        <button>管理权限</button>
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
