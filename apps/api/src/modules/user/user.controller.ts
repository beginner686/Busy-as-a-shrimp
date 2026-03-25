import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { UserService } from "./user.service";
import {
  LoginDto,
  RegisterDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  VerifyIdentityDto
} from "./dto/user.dto";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("register")
  register(@Body() payload: RegisterDto) {
    return ok(this.userService.register(payload), "注册成功");
  }

  @Post("login")
  login(@Body() payload: LoginDto) {
    return ok(this.userService.login(payload), "登录成功");
  }

  @Post("verify-identity")
  verifyIdentity(@Body() payload: VerifyIdentityDto) {
    return ok(this.userService.verifyIdentity(payload), "实名校验通过");
  }

  @Get("info")
  info() {
    return ok(this.userService.getInfo());
  }

  @Put("info")
  updateInfo(@Body() payload: UpdateUserInfoDto) {
    return ok(this.userService.updateInfo(payload), "用户信息已更新");
  }

  @Put("role")
  updateRole(@Body() payload: UpdateRoleDto) {
    return ok(this.userService.updateRole(payload), "角色已切换");
  }
}

