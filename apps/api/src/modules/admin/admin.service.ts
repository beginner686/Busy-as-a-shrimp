import { Injectable } from "@nestjs/common";
import { Prisma, ResourceStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { AdminUserStatus, CaptainLevel, QueryResourcesDto, QueryUsersDto } from "./dto/admin.dto";

type ExtendedPrisma = PrismaService & {
  announcement: {
    count: () => Promise<number>;
    create: (args: { data: { content: string; publisher: string } }) => Promise<{
      noticeId: bigint;
      content: string;
      publisher: string;
      createdAt: Date;
    }>;
    findMany: (args: { orderBy: { createdAt: "desc" }; take: number }) => Promise<
      Array<{
        noticeId: bigint;
        content: string;
        publisher: string;
        createdAt: Date;
      }>
    >;
  };
};

function normalizeTagList(value: Prisma.JsonValue): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeTagList(item))
      .filter((item, index, items) => items.indexOf(item) === index);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (typeof value === "number") {
    return [String(value)];
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => normalizeTagList(item as Prisma.JsonValue));
  }

  return [];
}

function normalizePriceRange(
  value: Prisma.JsonValue | null
): { min?: number; max?: number } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, Prisma.JsonValue>;
  const min = Number(record.min);
  const max = Number(record.max);
  const result: { min?: number; max?: number } = {};

  if (Number.isFinite(min)) {
    result.min = min;
  }
  if (Number.isFinite(max)) {
    result.max = max;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

import { ResourceService } from "../resource/resource.service";

@Injectable()
export class AdminService {
  private get extendedPrisma() {
    return this.prisma as unknown as ExtendedPrisma;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly resourceService: ResourceService
  ) {}

  async users(filters: QueryUsersDto) {
    const { status, role } = filters;
    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status as never;
    }
    if (role) {
      where.role = role as never;
    }

    const list = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return list.map((user) => ({
      userId: Number(user.userId),
      phoneMasked: user.maskedPhone || "hidden",
      role: user.role,
      city: user.city || "Unknown",
      memberLevel: user.memberLevel,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      captainLevel: user.captainLevel
    }));
  }

  async updateUserStatus(id: number, status: AdminUserStatus) {
    const updated = await this.prisma.user.update({
      where: { userId: BigInt(id) },
      data: { status: status as never }
    });

    return {
      userId: Number(updated.userId),
      status: updated.status
    };
  }

  async resources(filters: QueryResourcesDto) {
    const { status } = filters;
    const where: Prisma.ResourceWhereInput = {};

    if (status) {
      where.status = status as ResourceStatus;
    }

    const list = await this.prisma.resource.findMany({
      where,
      orderBy: { lastUpdate: "desc" },
      take: 50
    });

    return list.map((resource) => ({
      resourceId: Number(resource.resourceId),
      userId: Number(resource.userId),
      resourceType: resource.resourceType,
      tags: normalizeTagList(resource.tags),
      areaCode: resource.areaCode ?? undefined,
      priceRange: normalizePriceRange(resource.priceRange),
      status: resource.status,
      createdAt: (resource.lastUpdate ?? resource.verifiedAt)?.toISOString() ?? "",
      verifiedAt: resource.verifiedAt?.toISOString()
    }));
  }

  async reviewResource(id: number, decision: "approve" | "reject", reason?: string) {
    if (decision === "approve") {
      const updated = await this.resourceService.approveResource(BigInt(id));
      return {
        resourceId: Number(updated.resourceId),
        status: updated.status,
        note: "Approved via ResourceService logic"
      };
    }

    const updated = await this.prisma.resource.update({
      where: { resourceId: BigInt(id) },
      data: {
        status: ResourceStatus.rejected,
        verifiedAt: new Date(),
        lastUpdate: new Date()
      }
    });

    return {
      resourceId: Number(updated.resourceId),
      status: updated.status,
      note: reason
    };
  }

  async stats() {
    const [totalUsers, totalResources, totalMatches, activeCaptains, announcementCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.resource.count(),
        this.prisma.match.count(),
        this.prisma.user.count({ where: { role: { in: ["service", "both"] } } }),
        this.extendedPrisma.announcement.count()
      ]);

    return {
      totalUsers,
      activeUsers: Math.floor(totalUsers * 0.85),
      totalResources,
      pendingResources: Math.floor(totalResources * 0.1),
      activeCaptains,
      matchRate: totalResources > 0 ? Math.floor((totalMatches / totalResources) * 100) : 0,
      announcementCount
    };
  }

  async announce(content: string, publisher: string) {
    const created = await this.extendedPrisma.announcement.create({
      data: {
        content,
        publisher: publisher || "admin"
      }
    });

    return {
      noticeId: created.noticeId.toString(),
      content: created.content,
      publisher: created.publisher,
      createdAt: created.createdAt.toISOString()
    };
  }

  async announcements() {
    const list = await this.extendedPrisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return list.map((item) => ({
      noticeId: item.noticeId.toString(),
      content: item.content,
      publisher: item.publisher,
      createdAt: item.createdAt.toISOString()
    }));
  }

  async captainRanking() {
    const ranking = await this.prisma.inviteRecord.groupBy({
      by: ["inviterId"],
      _count: {
        recordId: true
      },
      orderBy: {
        _count: {
          recordId: "desc"
        }
      },
      take: 10
    });

    const inviterIds = ranking.map((item) => item.inviterId);
    const users = await this.prisma.user.findMany({
      where: { userId: { in: inviterIds } }
    });
    const userMap = new Map(users.map((item) => [item.userId.toString(), item]));

    return ranking.map((item) => {
      const user = userMap.get(item.inviterId.toString());
      const level = user?.captainLevel || "normal";
      const commissionRate = level === "gold" ? 0.15 : level === "advanced" ? 0.1 : 0.05;

      return {
        captainId: Number(item.inviterId),
        name: `Captain ${item.inviterId.toString().slice(-4)}`,
        level,
        score: item._count.recordId * 100,
        monthInvites: item._count.recordId,
        commissionRate
      };
    });
  }

  async updateCaptainLevel(id: number, level: CaptainLevel) {
    const updated = await this.prisma.user.update({
      where: { userId: BigInt(id) },
      data: { captainLevel: level } as Prisma.UserUpdateInput
    });

    return {
      captainId: Number(updated.userId),
      level: updated.captainLevel
    };
  }
}
