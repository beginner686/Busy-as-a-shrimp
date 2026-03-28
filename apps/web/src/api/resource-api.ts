import type { UploadResourceDto } from "@airp/api-types";
import type { HttpClientLike } from "./http";

export interface ResourceItem {
  resourceId: number | string;
  resourceType: "skill" | "location" | "account" | "time";
  tags: unknown;
  status: "active" | "inactive" | "pending" | "rejected";
}

export type ResourceTagGroups = Record<string, string[]>;

export function createResourceApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    upload(payload: UploadResourceDto): Promise<{ resourceId: number; reviewStatus: string }> {
      return client.post<{ resourceId: number; reviewStatus: string }>("/resource/upload", payload);
    },
    list(): Promise<ResourceItem[]> {
      return client.get<ResourceItem[]>("/resource/list");
    },
    tags(): Promise<ResourceTagGroups> {
      return client.get<ResourceTagGroups>("/resource/tags");
    }
  };
}
