import type { HttpClientLike } from "./http";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalResources: number;
  pendingResources: number;
  activeCaptains: number;
  matchRate: number;
  announcementCount: number;
}

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

export interface CaptainRank {
  captainId: number;
  name: string;
  level: "normal" | "advanced" | "gold";
  score: number;
  monthInvites: number;
  commissionRate: number;
}

export function createAdminApi(client: Pick<HttpClientLike, "get" | "put">) {
  return {
    stats(): Promise<AdminStats> {
      return client.get<AdminStats>("/admin/stats");
    },
    users(): Promise<AdminUser[]> {
      return client.get<AdminUser[]>("/admin/users");
    },
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
    captainRanking(): Promise<CaptainRank[]> {
      return client.get<CaptainRank[]>("/admin/captain/ranking");
    }
  };
}
