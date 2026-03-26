import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum ResourceType {
  SKILL = "skill",
  LOCATION = "location",
  ACCOUNT = "account",
  TIME = "time"
}

export enum ResourceStatus {
  PENDING = "pending",
  ACTIVE = "active",
  INACTIVE = "inactive",
  REJECTED = "rejected"
}

export class PriceRangeDto {
  @IsNumber()
  min!: number;

  @IsNumber()
  max!: number;
}

export class UploadResourceDto {
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsString()
  @IsOptional()
  areaCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;
}

export class UpdateResourceDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(ResourceStatus)
  @IsOptional()
  status?: ResourceStatus;

  @IsString()
  @IsOptional()
  areaCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;
}
