export type ResourceType = "skill" | "location" | "account" | "time";

export interface UploadResourceDto {
  resourceType: ResourceType;
  tags: string[];
  areaCode?: string;
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface UpdateResourceDto {
  tags?: string[];
  status?: "active" | "inactive";
}
