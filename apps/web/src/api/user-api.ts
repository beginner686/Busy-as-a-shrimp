import type { LoginDto, UpdateRoleDto, UpdateUserInfoDto } from "@airp/api-types";
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

export function createUserApi(client: Pick<HttpClientLike, "get" | "post" | "put">) {
  return {
    login(payload: LoginDto): Promise<LoginResult> {
      return client.post<LoginResult>("/user/login", { body: payload });
    },
    getInfo(): Promise<UserInfo> {
      return client.get<UserInfo>("/user/info");
    },
    updateInfo(payload: UpdateUserInfoDto): Promise<{ updated: boolean }> {
      return client.put<{ updated: boolean }>("/user/info", { body: payload });
    },
    updateRole(payload: UpdateRoleDto): Promise<{ updated: boolean; role: UpdateRoleDto["role"] }> {
      return client.put<{ updated: boolean; role: UpdateRoleDto["role"] }>("/user/role", {
        body: payload
      });
    }
  };
}
