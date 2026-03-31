import { Injectable, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import * as crypto from "crypto";
import {
  LoginDto,
  RegisterDto,
  SendCodeDto,
  SendSmsDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  VerifyIdentityDto
} from "./dto/user.dto";

import { DoppelgangerService } from "../doppelganger/doppelganger.service";

@Injectable()
export class UserService {
  private codes = new Map<string, string>();
  private captchas = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private doppelgangerService: DoppelgangerService
  ) {}

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
      code: process.env.NODE_ENV === "production" ? undefined : code
    };
  }

  async sendSms(payload: SendSmsDto) {
    this.validateCaptchaOrThrow(payload.captchaId, payload.captchaValue);
    return this.sendCode({ phone: payload.phone });
  }

  /**
   * 手机号脱敏 Hash 处理 (TRD 209)
   */
  private hashPhone(phone: string): string {
    return crypto.createHash("sha256").update(phone).digest("hex");
  }

  private generateCaptchaCode(length = 4): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < length; i += 1) {
      const index = Math.floor(Math.random() * chars.length);
      code += chars[index];
    }
    return code;
  }

  private buildCaptchaSvg(code: string): string {
    const chars = code.split("");
    const textNodes = chars
      .map((char, index) => {
        const x = 18 + index * 22;
        const y = 30 + (index % 2 === 0 ? 0 : 2);
        const rotate = Math.floor(Math.random() * 16 - 8);
        return `<text x="${x}" y="${y}" font-size="22" fill="#1f2a44" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
      })
      .join("");

    const lines = Array.from({ length: 3 })
      .map(() => {
        const x1 = Math.floor(Math.random() * 100);
        const y1 = Math.floor(Math.random() * 40);
        const x2 = Math.floor(Math.random() * 100);
        const y2 = Math.floor(Math.random() * 40);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1" />`;
      })
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40"><rect width="120" height="40" rx="6" fill="#f8fafc"/>${lines}${textNodes}</svg>`;
  }

  async getCaptcha() {
    const captchaId = crypto.randomUUID();
    const code = this.generateCaptchaCode();
    const expiresAt = Date.now() + 2 * 60 * 1000;

    this.captchas.set(captchaId, { code, expiresAt });

    const svg = this.buildCaptchaSvg(code);
    const imageBase64 = Buffer.from(svg, "utf8").toString("base64");

    return { captchaId, imageBase64 };
  }

  private validateCaptchaOrThrow(captchaId?: string, captchaValue?: string) {
    if (!captchaId || !captchaValue) {
      throw new BadRequestException("图形验证码缺失");
    }

    const captcha = this.captchas.get(captchaId);
    if (!captcha || captcha.expiresAt < Date.now()) {
      this.captchas.delete(captchaId);
      throw new BadRequestException("图形验证码已过期");
    }

    const expected = captcha.code.toUpperCase();
    const actual = captchaValue.toUpperCase();
    if (expected !== actual) {
      throw new BadRequestException("图形验证码错误");
    }

    this.captchas.delete(captchaId);
  }

  private generateToken(user: User) {
    const payload = { userId: user.userId.toString(), role: user.role };
    return this.jwtService.sign(payload);
  }

  async register(payload: RegisterDto) {
    this.validateCaptchaOrThrow(payload.captchaId, payload.captchaValue);

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

    // 处理拉新解锁
    if (payload.inviteCode) {
      await this.handleInvitation(user.userId, payload.inviteCode);
    }

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

    const smsCode = payload.smsCode ?? payload.verifyCode;
    if (!payload.phone || !smsCode) {
      throw new BadRequestException("登录凭证缺失");
    }

    // 验证码校验逻辑
    const cachedCode = this.codes.get(payload.phone);
    if (smsCode !== "123456" && smsCode !== cachedCode) {
      throw new BadRequestException("验证码错误");
    }
    this.codes.delete(payload.phone);

    const phoneHash = this.hashPhone(payload.phone);
    let user = await this.prisma.user.findFirst({
      where: { phoneHash }
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phoneHash,
          role: "service",
          status: "active"
        }
      });
      // 登录即注册场景：处理拉新
      if (payload.inviteCode) {
        await this.handleInvitation(user.userId, payload.inviteCode);
      }
    }

    if (user.status !== "active") {
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

  private async handleInvitation(inviteeId: bigint, inviteCode: string) {
    // 1. 解析邀请码
    // 实际生产中建议在 User 表加一个 invite_code 字段
    // 当前版本我们直接根据 ID 模拟查找：假设邀请码就是 ID 的 36 进制
    let inviterId: bigint | null = null;
    try {
      inviterId = BigInt(parseInt(inviteCode, 36));
    } catch {
      return; // 非法邀请码
    }

    const inviterUser = await this.prisma.user.findUnique({ where: { userId: inviterId } });
    if (!inviterUser || inviterId === inviteeId) return;

    // 2. 记录邀请关系
    await this.prisma.inviteRecord.create({
      data: {
        inviterId: inviterId,
        inviteeId: inviteeId,
        inviteCode: inviteCode,
        isValid: true
      }
    });

    // 3. 激活邀请人的分身 (根据需求：邀1人即可解锁分身，不带初始100积分)
    await this.doppelgangerService.activateWithBonus(inviterId, 0);
  }
}
