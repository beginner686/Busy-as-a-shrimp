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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

const userStatusOptions: Array<{ label: string; value: "all" | UserStatus }> = [
  { label: "全部", value: "all" },
  { label: "正常有效", value: "active" },
  { label: "被冻结", value: "frozen" },
  { label: "已封禁", value: "banned" }
];

const userRoleOptions: Array<{ label: string; value: "all" | UserRole }> = [
  { label: "所有角色", value: "all" },
  { label: "服务提供者", value: "service" },
  { label: "资源需求者", value: "resource" },
  { label: "双重身份", value: "both" }
];

const resourceStatusOptions: Array<{ label: string; value: "all" | ResourceStatus }> = [
  { label: "全部状态", value: "all" },
  { label: "等待审核", value: "pending" },
  { label: "正常展示", value: "active" },
  { label: "已下架", value: "inactive" },
  { label: "已退回", value: "rejected" }
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
    return "服务提供";
  }
  if (role === "resource") {
    return "资源寻求";
  }
  return "双重身份";
}

function levelLabel(level: CaptainLevel): string {
  if (level === "gold") {
    return "金牌王牌团长";
  }
  if (level === "advanced") {
    return "高级合伙团长";
  }
  return "普通拓展员";
}

export default function AdminHomePage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [, setProfile] = useState<AdminSessionProfile | null>(null);
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
      setActionMessage(`已将用户 ${userId} 状态设置为 ${status}`);
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
          reason: decision === "reject" ? "管理员手工拒绝。" : "管理员审批通过。"
        })
      });
      setActionMessage(`资源 ${resourceId} 已确认${decision === "approve" ? "审核通过" : "拒绝"}`);
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
      setError("抱歉，向全站发送的公告内容不能为空。");
      return;
    }
    try {
      await requestData("/admin/announce", token, {
        method: "POST",
        body: JSON.stringify({
          content: noticeContent.trim(),
          publisher: noticePublisher.trim() || "系统管理员"
        })
      });
      setNoticeContent("");
      setActionMessage("该系统通告已成功推送到平台！");
      await Promise.all([loadAnnouncements(token), loadStats(token)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求后台发布通告失败");
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

  if (!sessionReady) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>正在为您验证管理员鉴权核心...</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div
        className={styles.headerRow}
        style={{ justifyContent: "flex-end", marginBottom: "12px" }}
      >
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => token && void refreshAll(token)}
          >
            强制刷新数据
          </button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {actionMessage ? <p className={styles.message}>{actionMessage}</p> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>总计入驻用户数</span>
          <strong className={styles.statValue}>{stats?.totalUsers ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>有效活跃用户数</span>
          <strong className={styles.statValue}>{stats?.activeUsers ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>积压未审核资源</span>
          <strong className={styles.statValue}>{stats?.pendingResources ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>全生态合作撮合率</span>
          <strong className={styles.statValue}>
            {stats ? `${(stats.matchRate * 100).toFixed(1)}%` : "-"}
          </strong>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>会员账号管理中心</h2>
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
                <th>用户编号</th>
                <th>手机号</th>
                <th>身份角色</th>
                <th>常驻城市</th>
                <th>订阅版本</th>
                <th>账号状态</th>
                <th>最初注册时间</th>
                <th>操作面板</th>
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
                        ✅ 激活
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUserStatusChange(user.userId, "frozen")}
                      >
                        ❄️ 冻结
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUserStatusChange(user.userId, "banned")}
                      >
                        🚫 封禁
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
          <h2>全平台图文资源审核大厅</h2>
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
                <th>内部索引号</th>
                <th>发布者 UID</th>
                <th>资料类型</th>
                <th>附带标签</th>
                <th>业务状态</th>
                <th>首次提交时间</th>
                <th>管理员审批时间</th>
                <th>行使权限</th>
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
                        🟢 予以通过
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResourceReview(resource.resourceId, "reject")}
                      >
                        ❌ 拒绝驳回
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
            <h2>系统弹窗公共广播中心</h2>
          </div>
          <div className={styles.formRow}>
            <input
              type="text"
              value={noticePublisher}
              onChange={(event) => setNoticePublisher(event.target.value)}
              placeholder="此处填写发布署名（不填默认是管理员）"
            />
            <button type="button" onClick={() => void handlePublishAnnouncement()}>
              点击向全站发送
            </button>
          </div>
          <textarea
            className={styles.textarea}
            value={noticeContent}
            onChange={(event) => setNoticeContent(event.target.value)}
            placeholder="在此输入您的滚动系统通告正文..."
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
            <h2>合伙拓展团长龙虎榜</h2>
            <button type="button" onClick={handleExportRankingCsv}>
              一键导出报表 (CSV)
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>团长编码</th>
                  <th>团长花名</th>
                  <th>历史总积分</th>
                  <th>本月内推人数</th>
                  <th>尊享分润点位</th>
                  <th>权限级别</th>
                  <th>操作</th>
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
                        保存变更
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {loading ? <p className={styles.loading}>请稍候，超级工作台全量载入中...</p> : null}
    </main>
  );
}
