"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { getAdminToken, saveAdminSession, type AdminSessionProfile } from "../../lib/auth";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AdminLoginResult {
  token: string;
  expiresIn: number;
  profile: AdminSessionProfile;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001/api/v1";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getAdminToken()) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = (await response.json()) as ApiResponse<AdminLoginResult>;
      if (!body.success) {
        throw new Error(body.message || "Login failed");
      }

      saveAdminSession(body.data.token, body.data.profile);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Admin Login</h1>
        <p>Sign in to access moderation and operations dashboard.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className={styles.tipBox}>
          <p>Default account from environment:</p>
          <p>
            <code>ADMIN_USERNAME=admin</code>
          </p>
          <p>
            <code>ADMIN_PASSWORD=admin123</code>
          </p>
        </div>
      </section>
    </main>
  );
}
