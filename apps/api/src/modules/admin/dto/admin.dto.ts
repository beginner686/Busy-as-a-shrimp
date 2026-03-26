export type AdminUserStatus = "active" | "frozen" | "banned";
export type AdminUserRole = "service" | "resource" | "both";
export type AdminResourceStatus = "pending" | "active" | "inactive" | "rejected";
export type CaptainLevel = "normal" | "advanced" | "gold";

export interface QueryUsersDto {
  status?: AdminUserStatus;
  role?: AdminUserRole;
}

export interface UpdateUserStatusDto {
  status: AdminUserStatus;
}

export interface QueryResourcesDto {
  status?: AdminResourceStatus;
}

export interface ReviewResourceDto {
  decision: "approve" | "reject";
  reason?: string;
}

export interface PublishAnnouncementDto {
  content: string;
  publisher?: string;
}

export interface UpdateCaptainLevelDto {
  level: CaptainLevel;
}

export interface AdminLoginDto {
  username: string;
  password: string;
}

export interface AdminAuthProfile {
  adminId: number;
  username: string;
  role: "super_admin";
}

