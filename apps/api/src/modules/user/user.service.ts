import { Injectable } from "@nestjs/common";
import {
  LoginDto,
  RegisterDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  VerifyIdentityDto
} from "./dto/user.dto";

@Injectable()
export class UserService {
  register(payload: RegisterDto) {
    return {
      userId: 10001,
      phone: payload.phone,
      status: "active"
    };
  }

  login(payload: LoginDto) {
    return {
      token: "mock-jwt-token",
      loginType: payload.wechatCode ? "wechat" : "phone"
    };
  }

  verifyIdentity(payload: VerifyIdentityDto) {
    return {
      verified: true,
      name: payload.name
    };
  }

  getInfo() {
    return {
      userId: 10001,
      role: "both",
      memberLevel: "free",
      city: "Shanghai"
    };
  }

  updateInfo(payload: UpdateUserInfoDto) {
    return {
      updated: true,
      ...payload
    };
  }

  updateRole(payload: UpdateRoleDto) {
    return {
      updated: true,
      role: payload.role
    };
  }
}

