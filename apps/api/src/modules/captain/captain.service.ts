import { BadRequestException, Injectable } from "@nestjs/common";
import { CaptainLevel, CommissionStatus, Prisma, User } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { WithdrawChannel, WithdrawDto } from "./dto/captain.dto";

const RATE_BY_LEVEL: Record<CaptainLevel, number> = {
  normal: 0.6,
  advanced: 0.8,
  gold: 0.9
};

const RANKING_CACHE_TTL_MS = 5 * 60 * 1000;
const COMMISSION_CONFIRM_DAYS = 7;
const WITHDRAW_MIN_AMOUNT = 100;

export interface CaptainRankingItem {
  rank: number;
  captainId: number;
  name: string;
  level: CaptainLevel;
  score: number;
  monthInvites: number;
  commissionRate: number;
}

interface RankingCache {
  expiresAt: number;
  data: CaptainRankingItem[];
}

@Injectable()
export class CaptainService {
  private rankingCache: RankingCache | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async info(userId: bigint) {
    const user = await this.getUserOrThrow(userId);
    const inviteCode = this.generateInviteCode(user.userId);
    const inviteLink = this.buildInviteLink(inviteCode);

    return {
      level: user.captainLevel,
      commissionRate: RATE_BY_LEVEL[user.captainLevel],
      inviteCode,
      inviteLink,
      inviteQrCodeUrl: this.buildInviteQrCodeUrl(inviteLink),
      commissionRules: {
        firstPaymentOnly: true,
        confirmPeriodDays: COMMISSION_CONFIRM_DAYS,
        minWithdrawAmount: WITHDRAW_MIN_AMOUNT,
        withdrawArrival: "3 business days",
        supportedChannels: ["wechat", "bank"] as WithdrawChannel[]
      }
    };
  }

  async ranking() {
    if (this.rankingCache && this.rankingCache.expiresAt > Date.now()) {
      return this.rankingCache.data;
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalInvites, monthInvites] = await Promise.all([
      this.prisma.inviteRecord.groupBy({
        by: ["inviterId"],
        where: { isValid: true },
        _count: { recordId: true },
        orderBy: { _count: { recordId: "desc" } },
        take: 100
      }),
      this.prisma.inviteRecord.groupBy({
        by: ["inviterId"],
        where: {
          isValid: true,
          createdAt: { gte: monthStart }
        },
        _count: { recordId: true }
      })
    ]);

    if (totalInvites.length === 0) {
      this.rankingCache = {
        expiresAt: Date.now() + RANKING_CACHE_TTL_MS,
        data: []
      };
      return [];
    }

    const inviterIds = totalInvites.map((item) => item.inviterId);
    const users = await this.prisma.user.findMany({
      where: { userId: { in: inviterIds } },
      select: { userId: true, captainLevel: true }
    });

    const levelMap = new Map(users.map((user) => [user.userId.toString(), user.captainLevel]));
    const monthInviteMap = new Map(
      monthInvites.map((item) => [item.inviterId.toString(), item._count.recordId])
    );

    const rows = totalInvites
      .map((item) => {
        const captainId = Number(item.inviterId);
        const monthInviteCount = monthInviteMap.get(item.inviterId.toString()) ?? 0;
        const level = levelMap.get(item.inviterId.toString()) ?? "normal";
        const commissionRate = RATE_BY_LEVEL[level];

        return {
          captainId,
          level,
          monthInvites: monthInviteCount,
          commissionRate,
          score: Math.round(item._count.recordId * 100 * commissionRate),
          name: `captain_${captainId.toString().slice(-4)}`
        };
      })
      .sort((a, b) => b.score - a.score || b.monthInvites - a.monthInvites)
      .slice(0, 20)
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }));

    this.rankingCache = {
      expiresAt: Date.now() + RANKING_CACHE_TTL_MS,
      data: rows
    };

    return rows;
  }

  async commissions(userId: bigint) {
    await this.activateMaturedCommissions(userId);

    const records = await this.prisma.captainCommission.findMany({
      where: { captainId: userId },
      orderBy: [{ commissionId: "desc" }],
      take: 200
    });

    const now = Date.now();
    const data = records.map((record) => {
      const commissionAmount = this.toCurrency(record.commissionAmount);
      const orderAmount = this.toCurrency(record.orderAmount);
      const commissionRate = this.toCurrency(record.commissionRate);
      const activeAt = record.confirmAt
        ? new Date(record.confirmAt.getTime() + COMMISSION_CONFIRM_DAYS * 24 * 60 * 60 * 1000)
        : null;

      return {
        commissionId: Number(record.commissionId),
        orderId: Number(record.orderId),
        orderAmount,
        commissionRate,
        commissionAmount,
        status: record.status,
        confirmedAt: record.confirmAt?.toISOString(),
        activeAt: activeAt?.toISOString(),
        remainingConfirmDays:
          record.status === CommissionStatus.pending && activeAt
            ? Math.max(0, Math.ceil((activeAt.getTime() - now) / (24 * 60 * 60 * 1000)))
            : 0
      };
    });

    const summary = this.buildCommissionSummary(records);

    return {
      records: data,
      summary: {
        ...summary,
        firstPaymentOnly: true,
        confirmPeriodDays: COMMISSION_CONFIRM_DAYS,
        minWithdrawAmount: WITHDRAW_MIN_AMOUNT,
        withdrawArrival: "3 business days",
        supportedChannels: ["wechat", "bank"] as WithdrawChannel[]
      }
    };
  }

  async withdraw(userId: bigint, payload: WithdrawDto) {
    const requestedAmount = this.toCurrency(payload.amount);
    if (requestedAmount < WITHDRAW_MIN_AMOUNT) {
      throw new BadRequestException(`minimum withdraw amount is ${WITHDRAW_MIN_AMOUNT}`);
    }

    await this.activateMaturedCommissions(userId);

    const activeCommissions = await this.prisma.captainCommission.findMany({
      where: {
        captainId: userId,
        status: CommissionStatus.active
      },
      orderBy: [{ confirmAt: "asc" }, { commissionId: "asc" }]
    });

    const totalAvailable = activeCommissions.reduce(
      (sum, item) => sum + this.toCurrency(item.commissionAmount),
      0
    );

    if (totalAvailable < requestedAmount) {
      throw new BadRequestException("insufficient available commissions for withdrawal");
    }

    const selectedIds: bigint[] = [];
    let settledAmount = 0;
    for (const item of activeCommissions) {
      selectedIds.push(item.commissionId);
      settledAmount += this.toCurrency(item.commissionAmount);
      if (settledAmount >= requestedAmount) {
        break;
      }
    }

    if (selectedIds.length === 0) {
      throw new BadRequestException("no active commissions can be withdrawn");
    }

    await this.prisma.captainCommission.updateMany({
      where: {
        commissionId: { in: selectedIds },
        status: CommissionStatus.active
      },
      data: {
        status: CommissionStatus.paid,
        confirmAt: new Date()
      }
    });

    const now = new Date();
    const estimatedArrival = this.addBusinessDays(now, 3);

    return {
      requestId: `wd-${Date.now()}`,
      captainId: Number(userId),
      requestedAmount,
      settledAmount: this.toCurrency(settledAmount),
      status: "submitted",
      channel: payload.channel ?? "wechat",
      estimatedArrivalAt: estimatedArrival.toISOString(),
      remainingAvailableAmount: this.toCurrency(totalAvailable - settledAmount)
    };
  }

  async stats(userId: bigint) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayInvites, monthInvites, validInvites, totalInvites] = await Promise.all([
      this.prisma.inviteRecord.count({
        where: {
          inviterId: userId,
          createdAt: { gte: todayStart }
        }
      }),
      this.prisma.inviteRecord.count({
        where: {
          inviterId: userId,
          createdAt: { gte: monthStart }
        }
      }),
      this.prisma.inviteRecord.count({
        where: {
          inviterId: userId,
          isValid: true
        }
      }),
      this.prisma.inviteRecord.count({ where: { inviterId: userId } })
    ]);

    return {
      todayInvites,
      monthInvites,
      validInvites,
      totalInvites
    };
  }

  private async getUserOrThrow(userId: bigint): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new BadRequestException("user not found");
    }
    return user;
  }

  private generateInviteCode(userId: bigint): string {
    const base36 = userId
      .toString(36)
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "");
    return base36.padStart(6, "0").slice(-6);
  }

  private buildInviteLink(inviteCode: string): string {
    const webBase = (
      process.env.WEB_BASE_URL ??
      process.env.NEXT_PUBLIC_WEB_BASE_URL ??
      "http://localhost:3000"
    ).replace(/\/$/, "");
    return `${webBase}/auth?inviteCode=${encodeURIComponent(inviteCode)}`;
  }

  private buildInviteQrCodeUrl(inviteLink: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(inviteLink)}`;
  }

  private buildCommissionSummary(
    records: Array<{ status: CommissionStatus; commissionAmount: Prisma.Decimal }>
  ) {
    let pendingAmount = 0;
    let activeAmount = 0;
    let paidAmount = 0;
    let invalidAmount = 0;

    for (const item of records) {
      const amount = this.toCurrency(item.commissionAmount);
      if (item.status === CommissionStatus.pending) {
        pendingAmount += amount;
        continue;
      }
      if (item.status === CommissionStatus.active) {
        activeAmount += amount;
        continue;
      }
      if (item.status === CommissionStatus.paid) {
        paidAmount += amount;
        continue;
      }
      invalidAmount += amount;
    }

    return {
      pendingAmount: this.toCurrency(pendingAmount),
      availableAmount: this.toCurrency(activeAmount),
      paidAmount: this.toCurrency(paidAmount),
      invalidAmount: this.toCurrency(invalidAmount)
    };
  }

  private async activateMaturedCommissions(captainId: bigint) {
    const matureAt = new Date(Date.now() - COMMISSION_CONFIRM_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.captainCommission.updateMany({
      where: {
        captainId,
        status: CommissionStatus.pending,
        confirmAt: {
          not: null,
          lte: matureAt
        }
      },
      data: {
        status: CommissionStatus.active
      }
    });
  }

  private addBusinessDays(start: Date, days: number): Date {
    const date = new Date(start);
    let remaining = days;

    while (remaining > 0) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();
      if (day !== 0 && day !== 6) {
        remaining -= 1;
      }
    }

    return date;
  }

  private toCurrency(value: number | Prisma.Decimal): number {
    return Number(Number(value).toFixed(2));
  }
}
