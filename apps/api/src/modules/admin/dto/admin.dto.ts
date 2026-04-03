export type AdminUserStatus = "active" | "frozen" | "banned";
export type AdminUserRole = "service" | "resource" | "both";
export type AdminResourceStatus = "pending" | "active" | "inactive" | "rejected";
export type CaptainLevel = "normal" | "advanced" | "gold";
export type DictStatus = "normal" | "disabled";

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

export interface QueryDictDataDto {
  dictType?: string;
}

export interface CreateDictTypeDto {
  dictName: string;
  dictType: string;
  status: DictStatus;
  remark?: string;
}

export interface UpdateDictTypeDto {
  dictName: string;
  dictType: string;
  status: DictStatus;
  remark?: string;
}

export interface CreateDictDataDto {
  dictType: string;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: DictStatus;
  remark?: string;
}

export interface UpdateDictDataDto {
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: DictStatus;
  remark?: string;
}

export interface ReviewResourceDto {
  decision: "approve" | "reject";
  reason?: string;
}

export interface PublishAnnouncementDto {
  title: string;
  type: string;
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
