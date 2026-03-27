import type {
  CaptchaDto,
  LoginDto,
  RegisterDto,
  SendSmsDto,
  UpdateRoleDto,
  UpdateUserInfoDto
} from "@airp/api-types";
import type { HttpClientLike } from "./http";

export interface UserInfo {
  userId: number;
  role: "service" | "resource" | "both";
  memberLevel: string;
  city: string;
}

export interface LoginResult {
  token: string;
  loginType: "phone" | "wechat";
}

export interface RegisterResult {
  registered: boolean;
  userId: number;
}

export interface SendSmsResult {
  success: boolean;
  message: string;
  code?: string;
}

export function createUserApi(client: Pick<HttpClientLike, "get" | "post" | "put">) {
  return {
    register(payload: RegisterDto): Promise<RegisterResult> {
      return client.post<RegisterResult>("/user/register", payload);
    },
    sendSms(payload: SendSmsDto): Promise<SendSmsResult> {
      return client.post<SendSmsResult>("/user/send-sms", payload);
    },
    login(payload: LoginDto): Promise<LoginResult> {
      return client.post<LoginResult>("/user/login", payload);
    },
    fetchCaptcha(): Promise<CaptchaDto> {
      return client.get<CaptchaDto>("/user/captcha");
    },
    getInfo(): Promise<UserInfo> {
      return client.get<UserInfo>("/user/info");
    },
    updateInfo(payload: UpdateUserInfoDto): Promise<{ updated: boolean }> {
      return client.put<{ updated: boolean }>("/user/info", payload);
    },
    updateRole(payload: UpdateRoleDto): Promise<{ updated: boolean; role: UpdateRoleDto["role"] }> {
      return client.put<{ updated: boolean; role: UpdateRoleDto["role"] }>("/user/role", payload);
    }
  };
}
