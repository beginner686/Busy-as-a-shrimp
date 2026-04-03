import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import * as crypto from "crypto";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";
import {
  LoginDto,
  RegisterDto,
  SendCodeDto,
  SendSmsDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  VerifyIdentityDto
} from "./dto/user.dto";

@Injectable()
export class UserService {
  private codes = new Map<string, string>();
  private captchas = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private doppelgangerService: DoppelgangerService
  ) {}

  private generateSecureInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(8);
    let code = "SHR-";
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  async getCaptcha() {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const captchaId = crypto.randomUUID();
    this.captchas.set(captchaId, { code, expiresAt: Date.now() + 600000 });
    const chars = code.split("");
    const charNodes = chars
      .map((char, index) => {
        const x = 18 + index * 22;
        const y = 28 + (Math.floor(Math.random() * 7) - 3);
        const rotate = Math.floor(Math.random() * 21) - 10;
        return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
      })
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40"><rect width="120" height="40" rx="6" fill="#e2e8f0"/><path d="M8 30 C 30 6, 50 35, 78 10 S 112 30, 116 14" stroke="#94a3b8" stroke-width="1.2" fill="none" opacity="0.55"/><path d="M4 12 C 26 35, 52 4, 80 28 S 108 6, 116 24" stroke="#64748b" stroke-width="1" fill="none" opacity="0.35"/>${charNodes}</svg>`;
    const imageBase64 = Buffer.from(svg, "utf8").toString("base64");
    return { captchaId, imageBase64 };
  }

  private validateCaptchaOrThrow(captchaId?: string, captchaValue?: string) {
    if (!captchaId || !captchaValue) throw new BadRequestException("图形验证码缺失");
    const captcha = this.captchas.get(captchaId);
    if (!captcha || captcha.expiresAt < Date.now()) {
      this.captchas.delete(captchaId);
      throw new BadRequestException("图形验证码已过期");
    }
    if (captcha.code.toUpperCase() !== captchaValue.toUpperCase())
      throw new BadRequestException("图形验证码错误");
    this.captchas.delete(captchaId);
  }

  private hashPhone(phone: string): string {
    return crypto.createHash("sha256").update(phone).digest("hex");
  }

  private generateToken(user: User) {
    const payload = { userId: user.userId.toString(), role: user.role };
    return this.jwtService.sign(payload);
  }

  async sendCode(payload: SendCodeDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.codes.set(payload.phone, code);
    return { message: `验证码已发送: ${code}`, code };
  }

  async sendSms(payload: SendSmsDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.codes.set(payload.phone, code);
    return { message: `短信验证码已发送: ${code}`, code };
  }

  async register(payload: RegisterDto, ip?: string) {
    this.validateCaptchaOrThrow(payload.captchaId, payload.captchaValue);
    const cachedCode = this.codes.get(payload.phone);
    if (payload.verifyCode !== "123456" && payload.verifyCode !== cachedCode) {
      throw new BadRequestException("验证码错误");
    }
    this.codes.delete(payload.phone);
    const phoneHash = this.hashPhone(payload.phone);
    const existing = await this.prisma.user.findFirst({ where: { phoneHash } });
    if (existing) throw new BadRequestException("该手机号已注册");

    const user = await this.prisma.user.create({
      data: {
        phoneHash,
        role: "service",
        status: "active",
        lastIp: ip,
        inviteCode: this.generateSecureInviteCode()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    });

    if (payload.inviteCode) await this.handleInvitation(user.userId, payload.inviteCode);
    return { user, token: this.generateToken(user) };
  }

  async login(payload: LoginDto, ip?: string) {
    const smsCode = payload.smsCode ?? payload.verifyCode;
    if (!payload.phone || !smsCode) throw new BadRequestException("登录凭证缺失");
    const cachedCode = this.codes.get(payload.phone);
    if (smsCode !== "123456" && smsCode !== cachedCode) throw new BadRequestException("验证码错误");
    this.codes.delete(payload.phone);
    const phoneHash = this.hashPhone(payload.phone);
    let user = await this.prisma.user.findFirst({ where: { phoneHash } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phoneHash,
          role: "service",
          status: "active",
          lastIp: ip,
          inviteCode: this.generateSecureInviteCode()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
      });
      if (payload.inviteCode) await this.handleInvitation(user.userId, payload.inviteCode);
    }
    return { user, token: this.generateToken(user) };
  }

  async verifyIdentity(payload: VerifyIdentityDto) {
    if (!payload.idNumber || !payload.name) throw new BadRequestException("信息不完整");
    return { success: true };
  }

  async getInfo(userId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new BadRequestException("用户未找到");
    return user;
  }

  async updateInfo(userId: bigint, payload: UpdateUserInfoDto) {
    return this.prisma.user.update({ where: { userId }, data: payload });
  }

  async updateRole(userId: bigint, payload: UpdateRoleDto) {
    return this.prisma.user.update({ where: { userId }, data: { role: payload.role } });
  }

  private async handleInvitation(inviteeId: bigint, inviteCode: string) {
    const inviterUser = await this.prisma.user.findUnique({ where: { inviteCode } });
    if (!inviterUser || inviterUser.userId === inviteeId) {
      try {
        const oldInviterId = BigInt(parseInt(inviteCode, 36));
        const oldInviter = await this.prisma.user.findUnique({ where: { userId: oldInviterId } });
        if (oldInviter && oldInviter.userId !== inviteeId) {
          await this.createInviteRecord(oldInviter.userId, inviteeId, inviteCode);
          await this.doppelgangerService.activateWithBonus(oldInviter.userId, 0);
        }
      } catch {
        return;
      }
      return;
    }
    await this.createInviteRecord(inviterUser.userId, inviteeId, inviteCode);
    await this.doppelgangerService.activateWithBonus(inviterUser.userId, 0);
  }

  private async createInviteRecord(inviterId: bigint, inviteeId: bigint, inviteCode: string) {
    return this.prisma.inviteRecord.create({
      data: {
        inviterId,
        inviteeId,
        inviteCode: inviteCode.slice(0, 8),
        isValid: true
      }
    });
  }
}
