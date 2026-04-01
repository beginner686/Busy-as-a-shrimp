import type { HttpClientLike } from "./http";

// ── 统计 ──────────────────────────────────────────────
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalResources: number;
  pendingResources: number;
  activeCaptains: number;
  matchRate: number;
  announcementCount: number;
}

// ── 用户 ──────────────────────────────────────────────
export interface AdminUser {
  userId: number;
  phoneMasked: string;
  role: "service" | "resource" | "both";
  city: string;
  memberLevel: "free" | "monthly" | "yearly" | "lifetime";
  status: "active" | "frozen" | "banned";
  createdAt: string;
  captainLevel?: "normal" | "advanced" | "gold";
}

export type UserStatus = "active" | "frozen" | "banned";

// ── 资源 ──────────────────────────────────────────────
export interface AdminPriceRange {
  min?: number;
  max?: number;
}

export interface AdminResource {
  resourceId: number;
  userId: number;
  resourceType: "skill" | "location" | "account" | "time";
  tags: string[];
  areaCode?: string;
  priceRange?: AdminPriceRange;
  status: "pending" | "active" | "inactive" | "rejected";
  createdAt: string;
  verifiedAt?: string;
}

export type ReviewDecision = "approve" | "reject";

// ── 船长 ──────────────────────────────────────────────
export interface CaptainRank {
  captainId: number;
  name: string;
  level: "normal" | "advanced" | "gold";
  score: number;
  monthInvites: number;
  commissionRate: number;
}

export type CaptainLevel = "normal" | "advanced" | "gold";

// ── 公告 ──────────────────────────────────────────────
export type AnnouncementType = "notice" | "activity" | "warning";

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  publishedAt: string;
  publishedBy: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  type: AnnouncementType;
}

// ── 匹配 ──────────────────────────────────────────────
export interface AdminMatchRecord {
  matchId: number;
  taskId: string;
  needId: number;
  status: "queued" | "pushed" | "confirmed" | "completed" | "cancelled";
  score?: number;
  createdAt: string;
  confirmedAt?: string;
}

// ── 数据字典 ──────────────────────────────────────────
export interface DictType {
  dictId: number;
  dictName: string;
  dictType: string;
  status: "normal" | "disabled";
}

export interface DictData {
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: "normal" | "disabled";
}

// ── API 工厂 ──────────────────────────────────────────
export function createAdminApi(client: Pick<HttpClientLike, "get" | "put" | "post">) {
  return {
    // 统计
    stats(): Promise<AdminStats> {
      return client.get<AdminStats>("/admin/stats");
    },

    // 用户
    users(): Promise<AdminUser[]> {
      return client.get<AdminUser[]>("/admin/users");
    },
    updateUserStatus(
      userId: number,
      status: UserStatus
    ): Promise<{ userId: number; status: string }> {
      return client.put<{ userId: number; status: string }>(`/admin/users/${userId}/status`, {
        body: { status }
      });
    },

    // 资源
    resources(): Promise<AdminResource[]> {
      return client.get<AdminResource[]>("/admin/resources");
    },
    reviewResource(
      id: number,
      decision: ReviewDecision
    ): Promise<{ resourceId: number; status: string }> {
      return client.put<{ resourceId: number; status: string }>(`/admin/resources/${id}`, {
        body: { decision }
      });
    },

    // 船长
    captainRanking(): Promise<CaptainRank[]> {
      return client.get<CaptainRank[]>("/admin/captain/ranking");
    },
    updateCaptainLevel(
      captainId: number,
      level: CaptainLevel
    ): Promise<{ captainId: number; level: string }> {
      return client.put<{ captainId: number; level: string }>(`/admin/captain/${captainId}/level`, {
        body: { level }
      });
    },

    // 公告
    announce(dto: CreateAnnouncementDto): Promise<AdminAnnouncement> {
      return client.post<AdminAnnouncement>("/admin/announce", { body: dto });
    },

    // 匹配记录
    matches(): Promise<AdminMatchRecord[]> {
      return client.get<AdminMatchRecord[]>("/admin/matches");
    },

    // 数据字典
    dictTypes(): Promise<DictType[]> {
      return client.get<DictType[]>("/admin/dict/types");
    },
    dictData(dictType: string): Promise<DictData[]> {
      return client.get<DictData[]>(`/admin/dict/data?dictType=${encodeURIComponent(dictType)}`);
    }
  };
}
