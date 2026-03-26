import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { UploadResourceDto, UpdateResourceDto, ResourceStatus } from "./dto/resource.dto";

@Injectable()
export class ResourceService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(userId: bigint, payload: UploadResourceDto) {
    // 1. 风险扫描 (Mock)
    await this.scanRisk(payload.tags);

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
      await this.scanRisk(payload.tags);
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

  private async scanRisk(tags: string[]) {
    // 这里是 Mock 风险扫描，实际项目中需要对接专门的内容合规服务
    const sensitiveWords = ["违规", "禁止", "色情"];
    for (const tag of tags) {
      if (sensitiveWords.some((word) => tag.includes(word))) {
        throw new BadRequestException(`包含违规词汇: ${tag}`);
      }
    }
  }
}
