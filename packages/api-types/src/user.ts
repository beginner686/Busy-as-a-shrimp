export interface RegisterDto {
  phone: string;
  verifyCode: string;
}

export interface LoginDto {
  phone?: string;
  verifyCode?: string;
  wechatCode?: string;
}

export interface VerifyIdentityDto {
  name: string;
  idNumber: string;
}

export interface UpdateUserInfoDto {
  city?: string;
  district?: string;
}

export interface UpdateRoleDto {
  role: "service" | "resource" | "both";
}
