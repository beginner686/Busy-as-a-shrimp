import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import {
  LoginDto,
  RegisterDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  VerifyIdentityDto
} from "./dto/user.dto";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) { }

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
  async info(@CurrentUser() user: any) {
    const info = await this.userService.getInfo(BigInt(user.userId));
    return ok(info);
  }

  @Put("info")
  @UseGuards(JwtAuthGuard)
  async updateInfo(@CurrentUser() user: any, @Body() payload: UpdateUserInfoDto) {
    const updated = await this.userService.updateInfo(BigInt(user.userId), payload);
    return ok(updated, "用户信息已更新");
  }

  @Put("role")
  @UseGuards(JwtAuthGuard)
  async updateRole(@CurrentUser() user: any, @Body() payload: UpdateRoleDto) {
    const updated = await this.userService.updateRole(BigInt(user.userId), payload);
    return ok(updated, "角色已切换");
  }
}

