import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import {
  AdminResourceStatus,
  AdminUserRole,
  AdminUserStatus,
  CaptainLevel,
  QueryResourcesDto,
  QueryUsersDto
} from "./dto/admin.dto";
import { Prisma, ResourceStatus } from "@prisma/client";

interface ExtendedPrisma extends PrismaService {
  announcement: {
    count: () => Promise<number>;
    create: (args: { data: { content: string; publisher: string } }) => Promise<{
      noticeId: bigint;
      content: string;
      publisher: string;
      createdAt: Date;
    }>;
    findMany: (args: {
      orderBy: { createdAt: "desc" };
      take: number;
    }) => Promise<
      Array<{
        noticeId: bigint;
        content: string;
        publisher: string;
        createdAt: Date;
      }>
    >;
  };
}

@Injectable()
export class AdminService {
  private get extendedPrisma() {
    return this.prisma as unknown as ExtendedPrisma;
  }

  constructor(private readonly prisma: PrismaService) {}

  async users(filters: QueryUsersDto) {
    const { status, role } = filters;
    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status as any;
    }
    if (role) {
      where.role = role as any;
    }

    const list = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return list.map((u) => {
      const user = u as unknown as {
        userId: bigint;
        maskedPhone?: string;
        role: string;
        city?: string;
        memberLevel: string;
        status: string;
        createdAt: Date;
        captainLevel?: string;
      };
      return {
        userId: Number(user.userId),
        phoneMasked: user.maskedPhone || "已加密",
        role: user.role,
        city: user.city || "未知",
        memberLevel: user.memberLevel,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        captainLevel: user.captainLevel
      };
    });
  }

  async updateUserStatus(id: number, status: AdminUserStatus) {
    const updated = await this.prisma.user.update({
      where: { userId: BigInt(id) },
      data: { status: status as any }
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

    return list.map((r) => ({
      resourceId: Number(r.resourceId),
      userId: Number(r.userId),
      resourceType: r.resourceType,
      status: r.status,
      createdAt: (r.lastUpdate || r.verifiedAt || r.resourceId).toString(), // Fallback
      verifiedAt: r.verifiedAt?.toISOString()
    }));
  }

  async reviewResource(id: number, decision: "approve" | "reject", reason?: string) {
    const status = decision === "approve" ? ResourceStatus.active : ResourceStatus.rejected;
    const updated = await this.prisma.resource.update({
      where: { resourceId: BigInt(id) },
      data: {
        status,
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

    return list.map((a) => ({
      noticeId: a.noticeId.toString(),
      content: a.content,
      publisher: a.publisher,
      createdAt: a.createdAt.toISOString()
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

    const inviterIds = ranking.map((r) => r.inviterId);
    const users = await this.prisma.user.findMany({
      where: { userId: { in: inviterIds } }
    });

    const userMap = new Map(users.map((u) => [u.userId.toString(), u]));

    return ranking.map((r) => {
      const user: any = userMap.get(r.inviterId.toString());
      const level = user?.captainLevel || "normal";
      const commissionRate = level === "gold" ? 0.15 : level === "advanced" ? 0.1 : 0.05;

      return {
        captainId: Number(r.inviterId),
        name: `团长_${r.inviterId.toString().slice(-4)}`,
        level,
        score: r._count.recordId * 100,
        monthInvites: r._count.recordId,
        commissionRate
      };
    });
  }

  async updateCaptainLevel(id: number, level: CaptainLevel) {
    const updated = await this.prisma.user.update({
      where: { userId: BigInt(id) },
      data: { captainLevel: level } as unknown as Prisma.UserUpdateInput
    });
    return {
      captainId: Number(updated.userId),
      level: (updated as unknown as { captainLevel: string }).captainLevel
    };
  }
}
