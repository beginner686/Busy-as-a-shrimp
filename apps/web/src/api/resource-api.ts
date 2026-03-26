import type { UploadResourceDto } from "@airp/api-types";
import type { HttpClientLike } from "./http";

export interface ResourceItem {
  resourceId: number;
  resourceType: "skill" | "location" | "account" | "time";
  tags: string[];
  status: "active" | "inactive";
}

export function createResourceApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    upload(payload: UploadResourceDto): Promise<{ resourceId: number; reviewStatus: string }> {
      return client.post<{ resourceId: number; reviewStatus: string }>("/resource/upload", {
        body: payload
      });
    },
    list(): Promise<ResourceItem[]> {
      return client.get<ResourceItem[]>("/resource/list");
    },
    tags(): Promise<string[]> {
      return client.get<string[]>("/resource/tags");
    }
  };
}
