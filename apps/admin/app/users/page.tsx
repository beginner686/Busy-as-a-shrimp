"use client";

import { useEffect, useState } from "react";

import { getAdminApi } from "../../src/api";
import type { AdminUser } from "../../src/api/admin-api";
import { EmptyState } from "../../src/components/empty-state";
import styles from "../page.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-US", { hour12: false });
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
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load users.");
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
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>Review user status, roles, and recent sign-ups.</p>
        </div>
      </div>

      {loading ? <p className={styles.loading}>Loading users...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && users.length === 0 ? (
        <EmptyState title="No users yet" text="No user records are available in the admin view." />
      ) : null}

      {!loading && !error && users.length > 0 ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>User list</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>City</th>
                  <th>Member level</th>
                  <th>Status</th>
                  <th>Created at</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.userId}>
                    <td>#{item.userId}</td>
                    <td>{item.phoneMasked}</td>
                    <td>{item.role}</td>
                    <td>{item.city}</td>
                    <td>{item.memberLevel}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
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
