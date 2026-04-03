import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ResourceStatus, SubmissionStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import {
  AdminUserStatus,
  CaptainLevel,
  CreateDictTypeDto,
  CreateDictDataDto,
  DictStatus,
  QueryResourcesDto,
  QueryUsersDto,
  UpdateDictTypeDto,
  UpdateDictDataDto
} from "./dto/admin.dto";

type ExtendedPrisma = PrismaService & {
  announcement: {
    count: () => Promise<number>;
    create: (args: {
      data: { title: string; type: string; content: string; publisher: string };
    }) => Promise<{
      noticeId: bigint;
      title: string;
      type: string;
      content: string;
      publisher: string;
      createdAt: Date;
    }>;
    findMany: (args: { orderBy: { createdAt: "desc" }; take: number }) => Promise<
      Array<{
        noticeId: bigint;
        title: string;
        type: string;
        content: string;
        publisher: string;
        createdAt: Date;
      }>
    >;
  };
};

export interface AdminDictType {
  dictId: number;
  dictName: string;
  dictType: string;
  status: DictStatus;
  remark?: string;
}

export interface AdminDictData {
  dictDataId: number;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: DictStatus;
  remark?: string;
}

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

function normalizeOptionalText(value?: string): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidDictStatus(value: string): value is DictStatus {
  return value === "normal" || value === "disabled";
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

  async dictTypes(): Promise<AdminDictType[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        dict_id: bigint | number;
        dict_name: string;
        dict_type: string;
        status: DictStatus;
        remark: string | null;
      }>
    >`SELECT dict_id, dict_name, dict_type, status, remark FROM dict_types ORDER BY dict_id ASC`;

    return rows.map((item) => ({
      dictId: Number(item.dict_id),
      dictName: item.dict_name,
      dictType: item.dict_type,
      status: item.status,
      remark: item.remark ?? undefined
    }));
  }

  private async getDictTypeById(dictId: number): Promise<AdminDictType | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        dict_id: bigint | number;
        dict_name: string;
        dict_type: string;
        status: DictStatus;
        remark: string | null;
      }>
    >`
      SELECT dict_id, dict_name, dict_type, status, remark
      FROM dict_types
      WHERE dict_id = ${dictId}
      LIMIT 1
    `;

    const item = rows[0];
    if (!item) {
      return null;
    }

    return {
      dictId: Number(item.dict_id),
      dictName: item.dict_name,
      dictType: item.dict_type,
      status: item.status,
      remark: item.remark ?? undefined
    };
  }

  async createDictType(payload: CreateDictTypeDto): Promise<AdminDictType> {
    const dictName = payload.dictName?.trim();
    const dictType = payload.dictType?.trim();
    const status = payload.status;

    if (!dictName || !dictType) {
      throw new BadRequestException("dictName/dictType 不能为空");
    }
    if (!isValidDictStatus(status)) {
      throw new BadRequestException("status 仅支持 normal/disabled");
    }

    const exists = await this.prisma.$queryRaw<Array<{ dict_id: bigint | number }>>`
      SELECT dict_id
      FROM dict_types
      WHERE dict_type = ${dictType}
      LIMIT 1
    `;
    if (exists.length > 0) {
      throw new BadRequestException(`字典类型 ${dictType} 已存在`);
    }

    await this.prisma.$executeRaw`
      INSERT INTO dict_types
      (dict_name, dict_type, status, remark, created_at, updated_at)
      VALUES
      (${dictName}, ${dictType}, ${status}, ${normalizeOptionalText(payload.remark)}, NOW(), NOW())
    `;

    const insertResult = await this.prisma.$queryRaw<Array<{ lastInsertId: number | bigint }>>`
      SELECT LAST_INSERT_ID() AS lastInsertId
    `;
    const createdId = Number(insertResult[0]?.lastInsertId ?? 0);
    const created = await this.getDictTypeById(createdId);

    if (!created) {
      throw new NotFoundException("字典类型创建后读取失败");
    }

    return created;
  }

  async updateDictType(dictId: number, payload: UpdateDictTypeDto): Promise<AdminDictType> {
    const dictName = payload.dictName?.trim();
    const dictType = payload.dictType?.trim();
    const status = payload.status;

    if (!Number.isInteger(dictId) || dictId <= 0) {
      throw new BadRequestException("dictId 不合法");
    }
    if (!dictName || !dictType) {
      throw new BadRequestException("dictName/dictType 不能为空");
    }
    if (!isValidDictStatus(status)) {
      throw new BadRequestException("status 仅支持 normal/disabled");
    }

    const current = await this.getDictTypeById(dictId);
    if (!current) {
      throw new NotFoundException(`未找到 dict_id=${dictId} 的字典类型`);
    }

    const duplicated = await this.prisma.$queryRaw<Array<{ dict_id: bigint | number }>>`
      SELECT dict_id
      FROM dict_types
      WHERE dict_type = ${dictType}
        AND dict_id <> ${dictId}
      LIMIT 1
    `;
    if (duplicated.length > 0) {
      throw new BadRequestException(`字典类型 ${dictType} 已存在`);
    }

    await this.prisma.$transaction(async (tx) => {
      const affected = await tx.$executeRaw`
        UPDATE dict_types
        SET
          dict_name = ${dictName},
          dict_type = ${dictType},
          status = ${status},
          remark = ${normalizeOptionalText(payload.remark)},
          updated_at = NOW()
        WHERE dict_id = ${dictId}
      `;
      if (Number(affected) < 1) {
        throw new NotFoundException(`未找到 dict_id=${dictId} 的字典类型`);
      }

      if (current.dictType !== dictType) {
        await tx.$executeRaw`
          UPDATE dict_data
          SET dict_type = ${dictType}, updated_at = NOW()
          WHERE dict_type = ${current.dictType}
        `;
      }
    });

    const updated = await this.getDictTypeById(dictId);
    if (!updated) {
      throw new NotFoundException(`更新后未找到 dict_id=${dictId} 的字典类型`);
    }

    return updated;
  }

  async deleteDictType(dictId: number): Promise<{ dictId: number }> {
    if (!Number.isInteger(dictId) || dictId <= 0) {
      throw new BadRequestException("dictId 不合法");
    }

    const target = await this.getDictTypeById(dictId);
    if (!target) {
      throw new NotFoundException(`未找到 dict_id=${dictId} 的字典类型`);
    }

    const dataCountRows = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>`
      SELECT COUNT(1) AS total
      FROM dict_data
      WHERE dict_type = ${target.dictType}
    `;
    const dataCount = Number(dataCountRows[0]?.total ?? 0);
    if (dataCount > 0) {
      throw new BadRequestException("该字典类型下存在字典项，不能删除");
    }

    const affected = await this.prisma.$executeRaw`
      DELETE FROM dict_types
      WHERE dict_id = ${dictId}
    `;

    if (Number(affected) < 1) {
      throw new NotFoundException(`未找到 dict_id=${dictId} 的字典类型`);
    }

    return { dictId };
  }

  async dictData(dictType?: string): Promise<AdminDictData[]> {
    if (!dictType) {
      return [];
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        dict_data_id: bigint | number;
        dict_code: string;
        dict_label: string;
        dict_value: string;
        dict_sort: number | bigint;
        status: DictStatus;
        remark: string | null;
      }>
    >`
      SELECT dict_data_id, dict_code, dict_label, dict_value, dict_sort, status, remark
      FROM dict_data
      WHERE dict_type = ${dictType}
      ORDER BY dict_sort ASC
    `;

    return rows.map((item) => ({
      dictDataId: Number(item.dict_data_id),
      dictCode: item.dict_code,
      dictLabel: item.dict_label,
      dictValue: item.dict_value,
      dictSort: Number(item.dict_sort),
      status: item.status,
      remark: item.remark ?? undefined
    }));
  }

  private async getDictDataById(dictDataId: number): Promise<AdminDictData | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        dict_data_id: bigint | number;
        dict_code: string;
        dict_label: string;
        dict_value: string;
        dict_sort: number | bigint;
        status: DictStatus;
        remark: string | null;
      }>
    >`
      SELECT dict_data_id, dict_code, dict_label, dict_value, dict_sort, status, remark
      FROM dict_data
      WHERE dict_data_id = ${dictDataId}
      LIMIT 1
    `;

    const item = rows[0];
    if (!item) {
      return null;
    }

    return {
      dictDataId: Number(item.dict_data_id),
      dictCode: item.dict_code,
      dictLabel: item.dict_label,
      dictValue: item.dict_value,
      dictSort: Number(item.dict_sort),
      status: item.status,
      remark: item.remark ?? undefined
    };
  }

  async createDictData(payload: CreateDictDataDto): Promise<AdminDictData> {
    const dictType = payload.dictType?.trim();
    const dictCode = payload.dictCode?.trim();
    const dictLabel = payload.dictLabel?.trim();
    const dictValue = payload.dictValue?.trim();
    const status = payload.status;
    const dictSort = Number(payload.dictSort);

    if (!dictType || !dictCode || !dictLabel || !dictValue) {
      throw new BadRequestException("dictType/dictCode/dictLabel/dictValue 不能为空");
    }
    if (!isValidDictStatus(status)) {
      throw new BadRequestException("status 仅支持 normal/disabled");
    }
    if (!Number.isFinite(dictSort)) {
      throw new BadRequestException("dictSort 必须为数字");
    }

    await this.prisma.$executeRaw`
      INSERT INTO dict_data
      (dict_type, dict_code, dict_label, dict_value, dict_sort, status, remark, created_at, updated_at)
      VALUES
      (${dictType}, ${dictCode}, ${dictLabel}, ${dictValue}, ${dictSort}, ${status}, ${normalizeOptionalText(payload.remark)}, NOW(), NOW())
    `;

    const insertResult = await this.prisma.$queryRaw<Array<{ lastInsertId: number | bigint }>>`
      SELECT LAST_INSERT_ID() AS lastInsertId
    `;
    const createdId = Number(insertResult[0]?.lastInsertId ?? 0);
    const created = await this.getDictDataById(createdId);

    if (!created) {
      throw new NotFoundException("字典项创建后读取失败");
    }

    return created;
  }

  async updateDictData(dictDataId: number, payload: UpdateDictDataDto): Promise<AdminDictData> {
    const dictCode = payload.dictCode?.trim();
    const dictLabel = payload.dictLabel?.trim();
    const dictValue = payload.dictValue?.trim();
    const status = payload.status;
    const dictSort = Number(payload.dictSort);

    if (!Number.isInteger(dictDataId) || dictDataId <= 0) {
      throw new BadRequestException("dictDataId 不合法");
    }
    if (!dictCode || !dictLabel || !dictValue) {
      throw new BadRequestException("dictCode/dictLabel/dictValue 不能为空");
    }
    if (!isValidDictStatus(status)) {
      throw new BadRequestException("status 仅支持 normal/disabled");
    }
    if (!Number.isFinite(dictSort)) {
      throw new BadRequestException("dictSort 必须为数字");
    }

    const affected = await this.prisma.$executeRaw`
      UPDATE dict_data
      SET
        dict_code = ${dictCode},
        dict_label = ${dictLabel},
        dict_value = ${dictValue},
        dict_sort = ${dictSort},
        status = ${status},
        remark = ${normalizeOptionalText(payload.remark)},
        updated_at = NOW()
      WHERE dict_data_id = ${dictDataId}
    `;

    if (Number(affected) < 1) {
      throw new NotFoundException(`未找到 dict_data_id=${dictDataId} 的字典项`);
    }

    const updated = await this.getDictDataById(dictDataId);
    if (!updated) {
      throw new NotFoundException(`更新后未找到 dict_data_id=${dictDataId} 的字典项`);
    }

    return updated;
  }

  async deleteDictData(dictDataId: number): Promise<{ dictDataId: number }> {
    if (!Number.isInteger(dictDataId) || dictDataId <= 0) {
      throw new BadRequestException("dictDataId 不合法");
    }

    const affected = await this.prisma.$executeRaw`
      DELETE FROM dict_data
      WHERE dict_data_id = ${dictDataId}
    `;

    if (Number(affected) < 1) {
      throw new NotFoundException(`未找到 dict_data_id=${dictDataId} 的字典项`);
    }

    return { dictDataId };
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

  async announce(title: string, type: string, content: string, publisher: string) {
    const created = await this.extendedPrisma.announcement.create({
      data: {
        title,
        type,
        content,
        publisher: publisher || "admin"
      }
    });

    return {
      id: created.noticeId.toString(),
      title: created.title,
      type: created.type,
      content: created.content,
      publishedBy: created.publisher,
      publishedAt: created.createdAt.toISOString()
    };
  }

  async announcements() {
    const list = await this.extendedPrisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return list.map((item) => ({
      id: item.noticeId.toString(),
      title: item.title,
      type: item.type,
      content: item.content,
      publishedBy: item.publisher,
      publishedAt: item.createdAt.toISOString()
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

  async tasks() {
    const list = await this.prisma.bountyTask.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return list.map((item) => ({
      taskId: Number(item.taskId),
      title: item.title,
      points: Number(item.points),
      status: item.status,
      difficulty: item.difficulty
    }));
  }

  async submissions() {
    const list = await this.prisma.taskSubmission.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return list.map((item) => ({
      submissionId: Number(item.submissionId),
      userId: Number(item.userId),
      taskId: Number(item.taskId),
      proof: item.proof || "",
      status: item.status,
      createdAt: item.createdAt.toISOString()
    }));
  }

  async reviewSubmission(submissionId: number, decision: "approve" | "reject") {
    const status = decision === "approve" ? "APPROVED" : "REJECTED";
    // TODO: Ideally we should award points if approved
    const updated = await this.prisma.taskSubmission.update({
      where: { submissionId: BigInt(submissionId) },
      data: { status: status as SubmissionStatus }
    });
    return {
      submissionId: Number(updated.submissionId),
      status: updated.status
    };
  }
}
