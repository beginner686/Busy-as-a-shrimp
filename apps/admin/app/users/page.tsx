"use client";

import { useEffect, useState } from "react";
import { getAdminApi } from "../../src/api";
import { EmptyState } from "../../src/components/empty-state";
import { ErrorState } from "../../src/components/error-state";
import { getErrorMessage } from "../../src/utils/error-message";

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
    <main className="page glass">
      <h1 className="title">用户列表</h1>
      <p className="subtitle">数据来源：`GET /admin/users`。</p>

      {loading ? <p className="small">加载中...</p> : null}
      {error ? <ErrorState title="用户加载失败" text={error} /> : null}

      {!loading && !error && users.length === 0 ? (
        <EmptyState title="暂无用户" text="当前没有可展示的用户记录。" />
      ) : null}

      {!loading && !error && users.length > 0 ? (
        <section className="grid">
          {users.map((item) => (
            <article key={item.userId} className="glass card">
              <h3 className="card-title">用户 #{item.userId}</h3>
              <p className="small">状态：{item.status}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
