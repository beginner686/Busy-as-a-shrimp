import type { RunMatchDto } from "@airp/api-types";
import type { HttpClientLike } from "./http";

export interface MatchItem {
  matchId: number;
  needId: number;
  resourceId: number;
  score: number;
  status: "pushed" | "confirmed" | "queued" | "rejected";
}

export function createMatchApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    run(payload: RunMatchDto): Promise<{ taskId: string; status: string }> {
      return client.post<{ taskId: string; status: string }>("/match/run", payload);
    },
    list(): Promise<MatchItem[]> {
      return client.get<MatchItem[]>("/match/list");
    },
    confirm(id: number): Promise<{ matchId: number; status: string }> {
      return client.post<{ matchId: number; status: string }>(`/match/${id}/confirm`);
    },
    reject(id: number): Promise<{ matchId: number; status: string }> {
      return client.post<{ matchId: number; status: string }>(`/match/${id}/reject`);
    }
  };
}
