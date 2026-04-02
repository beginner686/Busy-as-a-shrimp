import { Injectable } from "@nestjs/common";
import { MemberLevel } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doppelgangerService: DoppelgangerService
  ) {}

  plans() {
    return [
      { code: "free", name: "免费版", price: 0 },
      { code: "monthly", name: "月度会员", price: 99 },
      { code: "yearly", name: "年度会员", price: 899 },
      { code: "lifetime", name: "终身版", price: 1999 }
    ];
  }

  async subscribe(userId: bigint, planCode: MemberLevel) {
    if (planCode === MemberLevel.free) return;

    return this.prisma.$transaction(async (tx) => {
      // 1. 更新会员等级
      const expireDate = new Date();
      if (planCode === MemberLevel.monthly) expireDate.setMonth(expireDate.getMonth() + 1);
      if (planCode === MemberLevel.yearly) expireDate.setFullYear(expireDate.getFullYear() + 1);
      if (planCode === MemberLevel.lifetime) expireDate.setFullYear(expireDate.getFullYear() + 99);

      await tx.user.update({
        where: { userId },
        data: {
          memberLevel: planCode,
          memberExpire: expireDate
        }
      });

      // 2. 激活分身及发放初始 100 积分
      await this.doppelgangerService.activateWithBonus(userId, 100);

      return { success: true, memberLevel: planCode, expireDate };
    });
  }
}
