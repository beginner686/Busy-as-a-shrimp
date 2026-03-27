export interface AdminLoginDto {
  username: string;
  password: string;
}

export interface AdminAuthProfile {
  adminId: number;
  username: string;
  role: "super_admin";
}

export type AdminUserStatus = "active" | "frozen" | "banned";
export type AdminUserRole = "service" | "resource" | "both";
export type AdminResourceStatus = "pending" | "active" | "inactive" | "rejected";
export type CaptainLevel = "normal" | "advanced" | "gold";

export interface PublishAnnouncementDto {
  content: string;
  publisher?: string;
}
