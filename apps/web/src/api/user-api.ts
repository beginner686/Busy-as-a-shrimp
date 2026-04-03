import type {
  CaptchaDto,
  LoginDto,
  RegisterDto,
  SendSmsDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  AdminLoginDto,
  VerifyIdentityDto
} from "@airp/api-types";
import type { AdminSessionProfile } from "../../../admin/lib/auth";
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

export interface MembershipPlan {
  code: string;
  name: string;
  price: number;
}

export interface CaptainInfo {
  level: string;
  commissionRate: number;
  inviteCode: string;
  inviteLink: string;
  inviteQrCodeUrl: string;
  commissionRules: Record<string, unknown>;
}

export interface CaptainStats {
  todayInvites: number;
  monthInvites: number;
  validInvites: number;
  totalInvites: number;
}

export interface CaptainCommissionRecord {
  commissionId: number;
  orderId: number;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  confirmedAt?: string;
  activeAt?: string;
  remainingConfirmDays: number;
}

export interface CaptainCommissions {
  records: CaptainCommissionRecord[];
  summary: {
    pendingAmount: number;
    availableAmount: number;
    paidAmount: number;
    invalidAmount: number;
  };
}

export interface AdminLoginResult {
  token: string;
  profile: AdminSessionProfile;
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
    },
    verifyIdentity(payload: VerifyIdentityDto): Promise<{ success: boolean }> {
      return client.post<{ success: boolean }>("/user/verify-identity", payload);
    },
    adminLogin(payload: AdminLoginDto): Promise<AdminLoginResult> {
      return client.post<AdminLoginResult>("/admin/login", payload);
    },
    getMembershipPlans(): Promise<MembershipPlan[]> {
      return client.get<MembershipPlan[]>("/membership/plans");
    },
    subscribePlan(
      planCode: string
    ): Promise<{ success: boolean; memberLevel: string; expireDate?: string }> {
      return client.post<{ success: boolean; memberLevel: string; expireDate?: string }>(
        "/membership/subscribe",
        { planCode }
      );
    },
    getCaptainInfo(): Promise<CaptainInfo> {
      return client.get<CaptainInfo>("/captain/info");
    },
    getCaptainStats(): Promise<CaptainStats> {
      return client.get<CaptainStats>("/captain/stats");
    },
    getCaptainCommissions(): Promise<CaptainCommissions> {
      return client.get<CaptainCommissions>("/captain/commissions");
    }
  };
}
