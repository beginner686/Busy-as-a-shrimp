export interface RegisterDto {
  phone: string;
  verifyCode: string;
  captchaId: string;
  captchaValue: string;
}

export interface SendSmsDto {
  phone: string;
  captchaId: string;
  captchaValue: string;
}

export interface LoginDto {
  phone?: string;
  smsCode?: string;
  verifyCode?: string;
  wechatCode?: string;
  captchaId?: string;
  captchaValue?: string;
}

export interface CaptchaDto {
  captchaId: string;
  imageBase64: string;
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
