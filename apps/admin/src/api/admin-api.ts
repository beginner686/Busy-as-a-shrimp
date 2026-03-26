import type { HttpClientLike } from "./http";

export interface AdminStats {
  totalUsers: number;
  totalResources: number;
  matchRate: number;
}

export interface AdminUser {
  userId: number;
  status: string;
}

export interface AdminResource {
  resourceId: number;
  reviewStatus: string;
}

export type ReviewDecision = "approve" | "reject";

export interface CaptainRank {
  captainId: number;
  level: "normal" | "advanced" | "gold";
  score: number;
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
