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

  async activateWithBonus(userId: bigint, bonusAmount: number = 100) {
    const doppelganger = await this.createOrUpdateDoppelganger(userId, 0);

    const existingBonus = await this.prisma.pointTransaction.findFirst({
      where: {
        doppelgangerId: doppelganger.doppelgangerId,
        // @ts-expect-error
        type: PointTransType.INITIAL_BONUS
      }
    });

    if (!existingBonus && bonusAmount > 0) {
      // @ts-expect-error
      await this.addPoints(userId, bonusAmount, PointTransType.INITIAL_BONUS, {
        reason: "Welcome Bonus"
      });
    }

    return doppelganger;
  }

  async addPoints(
    userId: bigint,
    amount: number,
    type: PointTransType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any
  ) {
    const doppelganger = await this.prisma.cyberDoppelganger.findUnique({
      where: { userId }
    });

    if (!doppelganger) throw new BadRequestException("Cyber Doppelganger not found for this user");

    return this.prisma.$transaction(async (tx) => {
      await tx.pointTransaction.create({
        data: {
          doppelgangerId: doppelganger.doppelgangerId,
          amount: new Prisma.Decimal(amount),
          type,
          metadata
        }
      });

      return tx.cyberDoppelganger.update({
        where: { doppelgangerId: doppelganger.doppelgangerId },
        data: {
          balance: { increment: new Prisma.Decimal(amount) }
        }
      });
    });
  }

  async consumePoints(userId: bigint, amount: number, metadata?: any) {
    return this.prisma.$transaction(async (tx) => {
      // @ts-expect-error
      const [doppelganger] = await tx.$queryRaw`
        SELECT doppelganger_id as doppelgangerId, balance, status 
        FROM cyber_doppelgangers 
        WHERE user_id = ${userId} 
        FOR UPDATE
      `;

      if (!doppelganger) throw new BadRequestException("Cyber Doppelganger not found");
      if (doppelganger.status !== DoppelgangerStatus.active) throw new BadRequestException("Active Cyber Doppelganger not found");
      if (Number(doppelganger.balance) < amount) throw new BadRequestException("Insufficient point balance");

      await tx.pointTransaction.create({
        data: {
          doppelgangerId: doppelganger.doppelgangerId,
          amount: new Prisma.Decimal(-amount),
          type: PointTransType.TOKEN_CONSUME,
          metadata: {
            ...metadata,
            audit: { timestamp: new Date().toISOString() }
          }
        }
      });

      return tx.cyberDoppelganger.update({
        where: { doppelgangerId: doppelganger.doppelgangerId },
        data: {
          balance: { decrement: new Prisma.Decimal(amount) }
        }
      });
    });
  }
}
