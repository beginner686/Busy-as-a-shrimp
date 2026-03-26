import { UserRole } from "@prisma/client";
import { IsMobilePhone, IsString, Length, IsOptional, IsEnum } from "class-validator";

export class SendCodeDto {
  @IsMobilePhone("zh-CN")
  phone!: string;
}

export class RegisterDto {
  @IsMobilePhone("zh-CN")
  phone!: string;

  @IsString()
  @Length(4, 6)
  verifyCode!: string; // 手机验证码
}

export class LoginDto {
  @IsMobilePhone("zh-CN")
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @Length(4, 6)
  verifyCode?: string;

  @IsString()
  @IsOptional()
  wechatCode?: string; // 微信授权码
}

export class VerifyIdentityDto {
  @IsString()
  name!: string;

  @IsString()
  @Length(15, 18)
  idNumber!: string; // 实名校验字段
}

export class UpdateUserInfoDto {
  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;
}

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
