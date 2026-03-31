import { Injectable, BadRequestException } from "@nestjs/common";
import { DoppelgangerStatus, PointTransType, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class DoppelgangerService {
  constructor(private readonly prisma: PrismaService) {}

  async getDoppelganger(userId: bigint) {
    return this.prisma.cyberDoppelganger.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } }
    });
  }

  async createOrUpdateDoppelganger(userId: bigint, initialBalance: number = 0) {
    return this.prisma.cyberDoppelganger.upsert({
      where: { userId },
      create: {
        userId,
        balance: initialBalance,
        status: DoppelgangerStatus.active
      },
      update: {
        status: DoppelgangerStatus.active
      }
    });
  }

  /**
   * 激活分身并根据规则发放初始奖金
   * 规则：订阅会员或完成3个资源上传后发放 100 积分
   */
  async activateWithBonus(userId: bigint, bonusAmount: number = 100) {
    const doppelganger = await this.createOrUpdateDoppelganger(userId, 0);

    // 只在首次激活（余额为0）且没有初始奖金记录时发放
    const existingBonus = await this.prisma.pointTransaction.findFirst({
      where: {
        doppelgangerId: doppelganger.doppelgangerId,
        type: PointTransType.INITIAL_BONUS
      }
    });

    if (!existingBonus && bonusAmount > 0) {
      await this.addPoints(userId, bonusAmount, PointTransType.INITIAL_BONUS, {
        reason: "Welcome Bonus"
      });
    }

    return doppelganger;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async addPoints(userId: bigint, amount: number, type: PointTransType, metadata?: any) {
    const doppelganger = await this.prisma.cyberDoppelganger.findUnique({
      where: { userId }
    });

    if (!doppelganger) {
      throw new BadRequestException("Cyber Doppelganger not found for this user");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      await tx.pointTransaction.create({
        data: {
          doppelgangerId: doppelganger.doppelgangerId,
          amount: new Prisma.Decimal(amount),
          type,
          metadata
        }
      });

      // 2. Update balance
      return tx.cyberDoppelganger.update({
        where: { doppelgangerId: doppelganger.doppelgangerId },
        data: {
          balance: { increment: new Prisma.Decimal(amount) }
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async consumePoints(userId: bigint, amount: number, metadata?: any) {
    const doppelganger = await this.prisma.cyberDoppelganger.findUnique({
      where: { userId }
    });

    if (!doppelganger || doppelganger.status !== DoppelgangerStatus.active) {
      throw new BadRequestException("Active Cyber Doppelganger not found");
    }

    if (Number(doppelganger.balance) < amount) {
      throw new BadRequestException("Insufficient point balance");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create consumption record
      await tx.pointTransaction.create({
        data: {
          doppelgangerId: doppelganger.doppelgangerId,
          amount: new Prisma.Decimal(-amount),
          type: PointTransType.TOKEN_CONSUME,
          metadata
        }
      });

      // 2. Update balance
      return tx.cyberDoppelganger.update({
        where: { doppelgangerId: doppelganger.doppelgangerId },
        data: {
          balance: { decrement: new Prisma.Decimal(amount) }
        }
      });
    });
  }
}
