import { Injectable, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../common/prisma.service";
import * as crypto from "crypto";
import {
  LoginDto,
  RegisterDto,
  SendCodeDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  VerifyIdentityDto
} from "./dto/user.dto";

@Injectable()
export class UserService {
  private codes = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  /**
   * 模拟发送手机验证码 (TRD 预留)
   */
  async sendCode(payload: SendCodeDto) {
    const code = Math.random().toString().slice(-6); // 随机 6 位
    this.codes.set(payload.phone, code);

    // 实际应调用短信服务商 SDK，此处仅模拟日志输出
    console.log(`[Mock SMS] 验证码已发送至 ${payload.phone}: ${code}`);

    return {
      success: true,
      message: "验证码已发送 (测试模式，请查看服务端控制台)",
      // 演示环境下为了方便测试，将 code 直接返回（生产严禁如此）
      code: process.env.NODE_ENV === 'development' ? code : undefined
    };
  }

  /**
   * 手机号脱敏 Hash 处理 (TRD 209)
   */
  private hashPhone(phone: string): string {
    return crypto.createHash("sha256").update(phone).digest("hex");
  }

  private generateToken(user: any) {
    const payload = { userId: user.userId.toString(), role: user.role };
    return this.jwtService.sign(payload);
  }

  async register(payload: RegisterDto) {
    // 验证码校验
    const cachedCode = this.codes.get(payload.phone);
    if (payload.verifyCode !== "123456" && payload.verifyCode !== cachedCode) {
      throw new BadRequestException("验证码错误");
    }
    this.codes.delete(payload.phone);

    const phoneHash = this.hashPhone(payload.phone);

    // 检查是否已注册
    const existing = await this.prisma.user.findFirst({
      where: { phoneHash }
    });
    if (existing) {
      throw new BadRequestException("该手机号已注册");
    }

    // 默认初始角色为 service (TRD 101)
    const user = await this.prisma.user.create({
      data: {
        phoneHash,
        role: "service",
        status: "active"
      }
    });

    return {
      user,
      token: this.generateToken(user)
    };
  }

  async login(payload: LoginDto) {
    // 微信登录预留位 (TRD 99)
    if (payload.wechatCode) {
      // TODO: 接入微信授权换取 OpenID 逻辑
      return { token: "mock-wechat-token-001" };
    }

    if (!payload.phone || !payload.verifyCode) {
      throw new BadRequestException("登录凭证缺失");
    }

    // 验证码校验逻辑
    const cachedCode = this.codes.get(payload.phone);
    if (payload.verifyCode !== "123456" && payload.verifyCode !== cachedCode) {
      throw new BadRequestException("验证码错误");
    }
    this.codes.delete(payload.phone);

    const phoneHash = this.hashPhone(payload.phone);
    const user = await this.prisma.user.findFirst({
      where: { phoneHash }
    });
    if (!user) {
      throw new BadRequestException("用户不存在，请先注册");
    }

    if (user.status !== 'active') {
      throw new BadRequestException("账号已被禁用或冻结");
    }

    return {
      user,
      token: this.generateToken(user)
    };
  }

  async verifyIdentity(payload: VerifyIdentityDto) {
    // TRD 100: 实名校验（只校验，不落库）
    // 此处仅模拟逻辑，不接入真实身份认证 API
    return {
      verified: true,
      name: payload.name,
      at: new Date().toISOString()
    };
  }

  async getInfo(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { userId }
    });
    if (!user) throw new BadRequestException("用户未找到");
    return user;
  }

  async updateInfo(userId: bigint, payload: UpdateUserInfoDto) {
    return this.prisma.user.update({
      where: { userId },
      data: payload
    });
  }

  async updateRole(userId: bigint, payload: UpdateRoleDto) {
    return this.prisma.user.update({
      where: { userId },
      data: { role: payload.role }
    });
  }
}

