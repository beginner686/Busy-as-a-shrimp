import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { UploadResourceDto, UpdateResourceDto, ResourceStatus } from "./dto/resource.dto";
import { ComplianceService } from "../compliance/compliance.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";

@Injectable()
export class ResourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: ComplianceService,
    private readonly doppelgangerService: DoppelgangerService
  ) {}

  /**
   * 管理员审核资源
   * 如果这是该用户第 3 个被审核通过的资源，则激活其赛博分身并奖励 100 积分
   */
  async approveResource(resourceId: bigint) {
    const resource = await this.prisma.resource.findUnique({
      where: { resourceId }
    });

    if (!resource) {
      throw new BadRequestException("资源不存在");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. 更新资源状态
      const updated = await tx.resource.update({
        where: { resourceId },
        data: { status: ResourceStatus.ACTIVE, lastUpdate: new Date() }
      });

      // 2. 统计用户已通过的资源总数
      const activeCount = await tx.resource.count({
        where: { userId: resource.userId, status: ResourceStatus.ACTIVE }
      });

      // 3. 触发奖励逻辑（刚好达到 3 个）
      if (activeCount === 3) {
        await this.doppelgangerService.activateWithBonus(resource.userId, 100);
      }

      return updated;
    });
  }

  async upload(userId: bigint, payload: UploadResourceDto) {
    // 1. 强制合规审计
    await this.compliance.checkTags(payload.tags);

    // 2. 创建资源并设置为待审核状态
    return this.prisma.resource.create({
      data: {
        userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resourceType: payload.resourceType as any,
        tags: payload.tags,
        areaCode: payload.areaCode,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        priceRange: payload.priceRange as any,
        status: ResourceStatus.PENDING,
        lastUpdate: new Date()
      }
    });
  }

  async list(userId: bigint) {
    return this.prisma.resource.findMany({
      where: { userId },
      orderBy: { lastUpdate: "desc" }
    });
  }

  async update(id: number, userId: bigint, payload: UpdateResourceDto) {
    // 检查资源归属
    const resource = await this.prisma.resource.findUnique({
      where: { resourceId: BigInt(id) }
    });

    if (!resource || resource.userId !== userId) {
      throw new BadRequestException("资源不存在或无权操作");
    }

    if (payload.tags) {
      await this.compliance.checkTags(payload.tags);
    }

    return this.prisma.resource.update({
      where: { resourceId: BigInt(id) },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags: payload.tags !== undefined ? payload.tags : (resource.tags as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (payload.status as any) || resource.status,
        areaCode: payload.areaCode !== undefined ? payload.areaCode : resource.areaCode,
        priceRange:
          payload.priceRange !== undefined
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (payload.priceRange as any)
            : resource.priceRange,
        lastUpdate: new Date()
      }
    });
  }

  async remove(id: number, userId: bigint) {
    // 检查资源归属
    const resource = await this.prisma.resource.findUnique({
      where: { resourceId: BigInt(id) }
    });

    if (!resource || resource.userId !== userId) {
      throw new BadRequestException("资源不存在或无权操作");
    }

    return this.prisma.resource.delete({
      where: { resourceId: BigInt(id) }
    });
  }

  async tags() {
    // 这里暂时返回支持的标签维度
    return {
      skill: ["短视频", "直播", "线下探店", "图文直推", "账号代运营商"],
      location: ["上海", "北京", "广州", "深圳", "杭州"],
      time: ["长期", "短期", "周末"],
      scale: ["个人", "工作室", "MCN机构"]
    };
  }
}
