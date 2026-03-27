import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ok } from "../../common/api-response";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import {
  LoginDto,
  RegisterDto,
  SendCodeDto,
  SendSmsDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  VerifyIdentityDto
} from "./dto/user.dto";

interface ICurrentUser {
  userId: string | bigint;
  role: UserRole;
}

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("captcha")
  async captcha() {
    const result = await this.userService.getCaptcha();
    return ok(result, "图形验证码已生成");
  }

  @Post("send-code")
  async sendCode(@Body() payload: SendCodeDto) {
    const result = await this.userService.sendCode(payload);
    return ok(result, result.message);
  }

  @Post("send-sms")
  async sendSms(@Body() payload: SendSmsDto) {
    const result = await this.userService.sendSms(payload);
    return ok(result, result.message);
  }

  @Post("register")
  async register(@Body() payload: RegisterDto) {
    const result = await this.userService.register(payload);
    return ok(result, "注册成功");
  }

  @Post("login")
  async login(@Body() payload: LoginDto) {
    const result = await this.userService.login(payload);
    return ok(result, "登录成功");
  }

  @Post("verify-identity")
  async verifyIdentity(@Body() payload: VerifyIdentityDto) {
    const result = await this.userService.verifyIdentity(payload);
    return ok(result, "实名校验通过");
  }

  @Get("info")
  @UseGuards(JwtAuthGuard)
  async info(@CurrentUser() user: ICurrentUser) {
    const info = await this.userService.getInfo(BigInt(user.userId));
    return ok(info);
  }

  @Put("info")
  @UseGuards(JwtAuthGuard)
  async updateInfo(@CurrentUser() user: ICurrentUser, @Body() payload: UpdateUserInfoDto) {
    const updated = await this.userService.updateInfo(BigInt(user.userId), payload);
    return ok(updated, "用户信息已更新");
  }

  @Put("role")
  @UseGuards(JwtAuthGuard)
  async updateRole(@CurrentUser() user: ICurrentUser, @Body() payload: UpdateRoleDto) {
    const updated = await this.userService.updateRole(BigInt(user.userId), payload);
    return ok(updated, "角色已切换");
  }
}
