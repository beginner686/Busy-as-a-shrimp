import { Controller, Get, Post, Body, UseGuards, BadRequestException } from "@nestjs/common";
import { MemberLevel } from "@prisma/client";
import { ok } from "../../common/api-response";
import { MembershipService } from "./membership.service";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { CurrentUser } from "../user/decorators/current-user.decorator";

interface ICurrentUser {
  userId: string | bigint;
}

@Controller("membership")
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get("plans")
  plans() {
    return ok(this.membershipService.plans());
  }

  @Post("subscribe")
  @UseGuards(JwtAuthGuard)
  async subscribe(@CurrentUser() user: ICurrentUser, @Body() payload: { planCode: string }) {
    if (!payload.planCode) {
      throw new BadRequestException("planCode is required");
    }

    // Convert string planCode to MemberLevel enum, defaulting to something safe if invalid
    let level: MemberLevel = MemberLevel.free;
    if (payload.planCode === "PRO" || payload.planCode === "monthly") level = MemberLevel.monthly;
    if (payload.planCode === "yearly") level = MemberLevel.yearly;
    if (payload.planCode === "LIFETIME" || payload.planCode === "lifetime")
      level = MemberLevel.lifetime;

    const result = await this.membershipService.subscribe(BigInt(user.userId), level);
    return ok(result || { success: true }, "Subscription successful");
  }
}
