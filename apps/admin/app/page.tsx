"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  AdminSessionProfile,
  clearAdminSession,
  getAdminProfile,
  getAdminToken
} from "../lib/auth";

type UserStatus = "active" | "frozen" | "banned";
type UserRole = "service" | "resource" | "both";
type ResourceStatus = "pending" | "active" | "inactive" | "rejected";
type CaptainLevel = "normal" | "advanced" | "gold";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalResources: number;
  pendingResources: number;
  activeCaptains: number;
  matchRate: number;
  announcementCount: number;
}

interface AdminUser {
  userId: number;
  phoneMasked: string;
  role: UserRole;
  city: string;
  memberLevel: "free" | "monthly" | "yearly" | "lifetime";
  status: UserStatus;
  createdAt: string;
}

interface AdminResource {
  resourceId: number;
  userId: number;
  resourceType: "skill" | "location" | "account" | "time";
  tags: string[];
  status: ResourceStatus;
  createdAt: string;
  verifiedAt?: string;
  reviewNote?: string;
}

interface AdminAnnouncement {
  noticeId: string;
  content: string;
  publisher: string;
  createdAt: string;
}

interface AdminCaptain {
  captainId: number;
  name: string;
  level: CaptainLevel;
  score: number;
  monthInvites: number;
  commissionRate: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001/api/v1";

const userStatusOptions: Array<{ label: string; value: "all" | UserStatus }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Frozen", value: "frozen" },
  { label: "Banned", value: "banned" }
];

const userRoleOptions: Array<{ label: string; value: "all" | UserRole }> = [
  { label: "All", value: "all" },
  { label: "Service", value: "service" },
  { label: "Resource", value: "resource" },
  { label: "Both", value: "both" }
];

const resourceStatusOptions: Array<{ label: string; value: "all" | ResourceStatus }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Rejected", value: "rejected" }
];

async function requestData<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new Error(body.message || "Request failed");
  }
  return body.data;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

function roleLabel(role: UserRole): string {
  if (role === "service") {
    return "Service";
  }
  if (role === "resource") {
    return "Resource";
  }
  return "Both";
}

function levelLabel(level: CaptainLevel): string {
  if (level === "gold") {
    return "Gold";
  }
  if (level === "advanced") {
    return "Advanced";
  }
  return "Normal";
}

export default function AdminHomePage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AdminSessionProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [resources, setResources] = useState<AdminResource[]>([]);
  const [captains, setCaptains] = useState<AdminCaptain[]>([]);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);

  const [noticeContent, setNoticeContent] = useState("");
  const [noticePublisher, setNoticePublisher] = useState("admin");

  const [userStatusFilter, setUserStatusFilter] = useState<"all" | UserStatus>("all");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | UserRole>("all");
  const [resourceStatusFilter, setResourceStatusFilter] = useState<"all" | ResourceStatus>("all");

  const [captainLevelDrafts, setCaptainLevelDrafts] = useState<Record<number, CaptainLevel>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");

  const userQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (userStatusFilter !== "all") {
      params.set("status", userStatusFilter);
    }
    if (userRoleFilter !== "all") {
      params.set("role", userRoleFilter);
    }
    return params.toString();
  }, [userStatusFilter, userRoleFilter]);

  const resourceQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (resourceStatusFilter !== "all") {
      params.set("status", resourceStatusFilter);
    }
    return params.toString();
  }, [resourceStatusFilter]);

  useEffect(() => {
    const existingToken = getAdminToken();
    if (!existingToken) {
      router.replace("/login");
      return;
    }

    setToken(existingToken);
    setProfile(getAdminProfile());

    void requestData<AdminSessionProfile>("/admin/me", existingToken)
      .then((me) => {
        setProfile(me);
        setSessionReady(true);
      })
      .catch(() => {
        clearAdminSession();
        router.replace("/login");
      });
  }, [router]);

  async function loadStats(currentToken: string): Promise<void> {
    const result = await requestData<AdminStats>("/admin/stats", currentToken);
    setStats(result);
  }

  async function loadUsers(currentToken: string): Promise<void> {
    const query = userQuery ? `?${userQuery}` : "";
    const result = await requestData<AdminUser[]>(`/admin/users${query}`, currentToken);
    setUsers(result);
  }

  async function loadResources(currentToken: string): Promise<void> {
    const query = resourceQuery ? `?${resourceQuery}` : "";
    const result = await requestData<AdminResource[]>(`/admin/resources${query}`, currentToken);
    setResources(result);
  }

  async function loadCaptains(currentToken: string): Promise<void> {
    const result = await requestData<AdminCaptain[]>("/admin/captain/ranking", currentToken);
    setCaptains(result);

    const draft: Record<number, CaptainLevel> = {};
    result.forEach((captain) => {
      draft[captain.captainId] = captain.level;
    });
    setCaptainLevelDrafts(draft);
  }

  async function loadAnnouncements(currentToken: string): Promise<void> {
    const result = await requestData<AdminAnnouncement[]>("/admin/announcements", currentToken);
    setAnnouncements(result);
  }

  async function refreshAll(currentToken: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadStats(currentToken),
        loadUsers(currentToken),
        loadResources(currentToken),
        loadCaptains(currentToken),
        loadAnnouncements(currentToken)
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !sessionReady) {
      return;
    }
    void refreshAll(token);
  }, [token, sessionReady]);

  useEffect(() => {
    if (!token || !sessionReady || loading) {
      return;
    }
    void loadUsers(token).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    });
  }, [token, sessionReady, userQuery]);

  useEffect(() => {
    if (!token || !sessionReady || loading) {
      return;
    }
    void loadResources(token).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to fetch resources");
    });
  }, [token, sessionReady, resourceQuery]);

  async function handleUserStatusChange(userId: number, status: UserStatus): Promise<void> {
    if (!token) {
      return;
    }
    try {
      await requestData(`/admin/users/${userId}/status`, token, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      setActionMessage(`User ${userId} status set to ${status}`);
      await Promise.all([loadUsers(token), loadStats(token)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user status");
    }
  }

  async function handleResourceReview(
    resourceId: number,
    decision: "approve" | "reject"
  ): Promise<void> {
    if (!token) {
      return;
    }
    try {
      await requestData(`/admin/resources/${resourceId}`, token, {
        method: "PUT",
        body: JSON.stringify({
          decision,
          reason:
            decision === "reject" ? "Manually rejected by moderator." : "Approved by moderator."
        })
      });
      setActionMessage(
        `Resource ${resourceId} ${decision === "approve" ? "approved" : "rejected"}`
      );
      await Promise.all([loadResources(token), loadStats(token)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review resource");
    }
  }

  async function handlePublishAnnouncement(): Promise<void> {
    if (!token) {
      return;
    }
    if (!noticeContent.trim()) {
      setError("Please enter announcement content.");
      return;
    }
    try {
      await requestData("/admin/announce", token, {
        method: "POST",
        body: JSON.stringify({
          content: noticeContent.trim(),
          publisher: noticePublisher.trim() || "admin"
        })
      });
      setNoticeContent("");
      setActionMessage("Announcement published");
      await Promise.all([loadAnnouncements(token), loadStats(token)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish announcement");
    }
  }

  async function handleCaptainLevelSave(captainId: number): Promise<void> {
    if (!token) {
      return;
    }
    try {
      const targetLevel = captainLevelDrafts[captainId];
      await requestData(`/admin/captain/${captainId}/level`, token, {
        method: "PUT",
        body: JSON.stringify({ level: targetLevel })
      });
      setActionMessage(`Captain ${captainId} upgraded to ${targetLevel}`);
      await Promise.all([loadCaptains(token), loadStats(token)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update captain level");
    }
  }

  function handleExportRankingCsv(): void {
    const header = "captainId,name,level,score,monthInvites,commissionRate";
    const rows = captains.map((captain) =>
      [
        captain.captainId,
        captain.name,
        captain.level,
        captain.score,
        captain.monthInvites,
        captain.commissionRate
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `captain-ranking-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function handleLogout(): void {
    clearAdminSession();
    router.replace("/login");
  }

  if (!sessionReady) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>Checking admin session...</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Admin Control Center</h1>
          <p className={styles.subtitle}>
            Manage users, moderation, announcements and captain growth strategy.
          </p>
          <p className={styles.sessionInfo}>Signed in as {profile?.username ?? "admin"}</p>
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => token && void refreshAll(token)}
          >
            Refresh
          </button>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {actionMessage ? <p className={styles.message}>{actionMessage}</p> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Total Users</span>
          <strong className={styles.statValue}>{stats?.totalUsers ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Active Users</span>
          <strong className={styles.statValue}>{stats?.activeUsers ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Pending Resources</span>
          <strong className={styles.statValue}>{stats?.pendingResources ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Match Rate</span>
          <strong className={styles.statValue}>
            {stats ? `${(stats.matchRate * 100).toFixed(1)}%` : "-"}
          </strong>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>User Management</h2>
          <div className={styles.filters}>
            <select
              value={userStatusFilter}
              onChange={(event) => setUserStatusFilter(event.target.value as "all" | UserStatus)}
            >
              {userStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={userRoleFilter}
              onChange={(event) => setUserRoleFilter(event.target.value as "all" | UserRole)}
            >
              {userRoleOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Phone</th>
                <th>Role</th>
                <th>City</th>
                <th>Member</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId}>
                  <td>{user.userId}</td>
                  <td>{user.phoneMasked}</td>
                  <td>{roleLabel(user.role)}</td>
                  <td>{user.city}</td>
                  <td>{user.memberLevel}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[user.status]}`}>{user.status}</span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className={styles.actionInline}>
                      <button
                        type="button"
                        onClick={() => void handleUserStatusChange(user.userId, "active")}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUserStatusChange(user.userId, "frozen")}
                      >
                        Freeze
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUserStatusChange(user.userId, "banned")}
                      >
                        Ban
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Resource Moderation</h2>
          <div className={styles.filters}>
            <select
              value={resourceStatusFilter}
              onChange={(event) =>
                setResourceStatusFilter(event.target.value as "all" | ResourceStatus)
              }
            >
              {resourceStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Resource ID</th>
                <th>User ID</th>
                <th>Type</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Created</th>
                <th>Reviewed At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.resourceId}>
                  <td>{resource.resourceId}</td>
                  <td>{resource.userId}</td>
                  <td>{resource.resourceType}</td>
                  <td>{resource.tags.join(", ")}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[resource.status]}`}>
                      {resource.status}
                    </span>
                  </td>
                  <td>{formatDate(resource.createdAt)}</td>
                  <td>{formatDate(resource.verifiedAt)}</td>
                  <td>
                    <div className={styles.actionInline}>
                      <button
                        type="button"
                        onClick={() => void handleResourceReview(resource.resourceId, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResourceReview(resource.resourceId, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panelSplit}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>System Announcements</h2>
          </div>
          <div className={styles.formRow}>
            <input
              type="text"
              value={noticePublisher}
              onChange={(event) => setNoticePublisher(event.target.value)}
              placeholder="publisher"
            />
            <button type="button" onClick={() => void handlePublishAnnouncement()}>
              Publish
            </button>
          </div>
          <textarea
            className={styles.textarea}
            value={noticeContent}
            onChange={(event) => setNoticeContent(event.target.value)}
            placeholder="Write announcement content"
          />
          <ul className={styles.announcementList}>
            {announcements.map((item) => (
              <li key={item.noticeId}>
                <p>{item.content}</p>
                <span>
                  {item.publisher} · {formatDate(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Captain Ranking</h2>
            <button type="button" onClick={handleExportRankingCsv}>
              Export CSV
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Captain ID</th>
                  <th>Name</th>
                  <th>Score</th>
                  <th>Invites</th>
                  <th>Rate</th>
                  <th>Level</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {captains.map((captain) => (
                  <tr key={captain.captainId}>
                    <td>{captain.captainId}</td>
                    <td>{captain.name}</td>
                    <td>{captain.score}</td>
                    <td>{captain.monthInvites}</td>
                    <td>{Math.round(captain.commissionRate * 100)}%</td>
                    <td>
                      <select
                        value={captainLevelDrafts[captain.captainId] ?? captain.level}
                        onChange={(event) =>
                          setCaptainLevelDrafts((prev) => ({
                            ...prev,
                            [captain.captainId]: event.target.value as CaptainLevel
                          }))
                        }
                      >
                        <option value="normal">{levelLabel("normal")}</option>
                        <option value="advanced">{levelLabel("advanced")}</option>
                        <option value="gold">{levelLabel("gold")}</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void handleCaptainLevelSave(captain.captainId)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {loading ? <p className={styles.loading}>Loading admin workspace...</p> : null}
    </main>
  );
}
