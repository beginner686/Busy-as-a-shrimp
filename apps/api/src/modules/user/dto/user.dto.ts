import { UserRole } from "@prisma/client";
import { IsMobilePhone, IsString, Length, IsOptional, IsEnum, Matches } from "class-validator";

export class SendCodeDto {
  @IsMobilePhone("zh-CN")
  phone!: string;
}

export class SendSmsDto {
  @IsMobilePhone("zh-CN")
  phone!: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^[a-zA-Z0-9]{4}$/)
  captchaValue!: string;

  @IsString()
  captchaId!: string;
}

export class RegisterDto {
  @IsMobilePhone("zh-CN")
  phone!: string;

  @IsString()
  @Length(4, 6)
  verifyCode!: string; // 手机验证码

  @IsString()
  @Length(4, 4)
  @Matches(/^[a-zA-Z0-9]{4}$/)
  captchaValue!: string;

  @IsString()
  captchaId!: string;
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
  @Length(4, 6)
  smsCode?: string;

  @IsString()
  @IsOptional()
  @Length(4, 4)
  @Matches(/^[a-zA-Z0-9]{4}$/)
  captchaValue?: string;

  @IsString()
  @IsOptional()
  captchaId?: string;

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
