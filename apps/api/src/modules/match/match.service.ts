import { BadRequestException, Injectable } from "@nestjs/common";
import { MatchStatus, Prisma, ResourceStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { MatchListQueryDto, RunMatchDto } from "./dto/match.dto";

type PriceRange = { min: number; max: number };

type NeedProfile = {
  needId: number;
  locationTags: string[];
  skillTags: string[];
  timeTags: string[];
  priceRange: PriceRange;
  collectedAt: string;
  nextCollectionAt: string;
  nextPushAt: string;
  source: string;
};

const SCORE_WEIGHT = {
  location: 0.3,
  skill: 0.35,
  time: 0.2,
  price: 0.15
} as const;

const LOCATION_POOL = ["shanghai", "beijing", "guangzhou", "shenzhen", "hangzhou", "chengdu"];

const SKILL_POOL = [
  "short-video",
  "live-stream",
  "script-writing",
  "editing",
  "mcn-operation",
  "private-domain"
];

const TIME_POOL = ["weekday-day", "weekday-night", "weekend", "long-term"];

const NEED_COLLECTION_INTERVAL_HOURS = 6;

@Injectable()
export class MatchService {
  private readonly needProfileCache = new Map<number, NeedProfile>();

  constructor(private readonly prisma: PrismaService) {}

  async run(userId: bigint, payload: RunMatchDto) {
    const resources = await this.prisma.resource.findMany({
      where: {
        userId,
        status: ResourceStatus.active
      },
      select: {
        resourceId: true,
        areaCode: true,
        tags: true,
        priceRange: true
      }
    });

    const taskId = `match-${Date.now()}`;
    if (resources.length === 0) {
      return {
        taskId,
        needId: payload.needId,
        status: "queued",
        matchedCount: 0,
        reason: "no active resource found"
      };
    }

    const profile = this.resolveNeedProfile(payload);
    const resourceIds = resources.map((resource) => resource.resourceId);

    const doneCounts = await this.prisma.match.groupBy({
      by: ["resourceId"],
      where: {
        resourceId: { in: resourceIds },
        status: MatchStatus.done
      },
      _count: { matchId: true }
    });
    const doneCountMap = new Map(
      doneCounts.map((item) => [item.resourceId.toString(), item._count.matchId])
    );

    const scored = resources
      .map((resource) => {
        const tags = this.normalizeTags(resource.tags);
        const locationTags = this.extractLocationTags(resource.areaCode, tags);
        const timeTags = this.extractTimeTags(tags);
        const skillTags = this.extractSkillTags(tags);
        const priceRange = this.parsePriceRange(resource.priceRange);

        const locationScore =
          profile.locationTags.length === 0
            ? 70
            : this.calcOverlapScore(profile.locationTags, locationTags);
        const skillScore =
          profile.skillTags.length === 0 ? 70 : this.calcOverlapScore(profile.skillTags, skillTags);
        const timeScore =
          profile.timeTags.length === 0 ? 70 : this.calcOverlapScore(profile.timeTags, timeTags);
        const priceScore = this.calcPriceScore(profile.priceRange, priceRange);

        const baseScore =
          locationScore * SCORE_WEIGHT.location +
          skillScore * SCORE_WEIGHT.skill +
          timeScore * SCORE_WEIGHT.time +
          priceScore * SCORE_WEIGHT.price;

        const doneCount = doneCountMap.get(resource.resourceId.toString()) ?? 0;
        const qualityBonus = Math.min(12, doneCount * 1.5);
        const finalScore = this.toTwoDecimals(Math.min(100, baseScore + qualityBonus));

        return {
          resourceId: resource.resourceId,
          score: finalScore,
          locationTags,
          skillTags,
          timeTags
        };
      })
      .filter((item) => item.score >= 25)
      .sort((a, b) => b.score - a.score)
      .slice(0, payload.topK ?? 20);

    await this.prisma.match.deleteMany({
      where: {
        needId: BigInt(payload.needId),
        resourceId: { in: resourceIds },
        status: { in: [MatchStatus.pushed, MatchStatus.viewed, MatchStatus.invalid] }
      }
    });

    if (scored.length > 0) {
      await this.prisma.match.createMany({
        data: scored.map((item) => ({
          needId: BigInt(payload.needId),
          resourceId: item.resourceId,
          matchScore: new Prisma.Decimal(item.score.toFixed(2)),
          status: MatchStatus.pushed,
          pushTime: this.nextPushTime()
        }))
      });
    }

    return {
      taskId,
      needId: payload.needId,
      status: "queued",
      matchedCount: scored.length,
      dimensions: {
        locationTags: profile.locationTags,
        skillTags: profile.skillTags,
        timeTags: profile.timeTags,
        priceRange: profile.priceRange
      },
      schedule: {
        collectedAt: profile.collectedAt,
        nextCollectionAt: profile.nextCollectionAt,
        nextPushAt: profile.nextPushAt
      }
    };
  }

  async list(userId: bigint, query: MatchListQueryDto) {
    const where: Prisma.MatchWhereInput = {
      resource: {
        is: {
          userId
        }
      }
    };

    if (query.needId) {
      where.needId = BigInt(query.needId);
    }

    const rows = await this.prisma.match.findMany({
      where,
      include: {
        resource: {
          select: {
            areaCode: true,
            tags: true
          }
        }
      },
      orderBy: [{ matchScore: "desc" }, { matchId: "desc" }],
      take: 200
    });

    return rows.map((row) => {
      const tags = this.normalizeTags(row.resource.tags);
      const locationTags = this.extractLocationTags(row.resource.areaCode, tags).slice(0, 3);
      const skillTags = this.extractSkillTags(tags).slice(0, 4);
      const timeTags = this.extractTimeTags(tags).slice(0, 2);
      const status = row.status;

      return {
        matchId: Number(row.matchId),
        needId: Number(row.needId),
        resourceId: Number(row.resourceId),
        score: this.toTwoDecimals(Number(row.matchScore)),
        status,
        locationTags,
        skillTags,
        timeTags,
        contactMasked:
          status === MatchStatus.confirmed
            ? this.buildVirtualContact(Number(row.matchId))
            : this.maskContact(undefined),
        pushTime: row.pushTime?.toISOString()
      };
    });
  }

  async confirm(userId: bigint, matchId: number) {
    if (!Number.isFinite(matchId) || matchId <= 0) {
      throw new BadRequestException("invalid match id");
    }

    const match = await this.prisma.match.findUnique({
      where: { matchId: BigInt(matchId) },
      include: {
        resource: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!match || match.resource.userId !== userId) {
      throw new BadRequestException("match record not found");
    }

    const updated = await this.prisma.match.update({
      where: { matchId: match.matchId },
      data: { status: MatchStatus.confirmed }
    });

    return {
      matchId: Number(updated.matchId),
      status: updated.status,
      virtualContact: this.buildVirtualContact(Number(updated.matchId))
    };
  }

  async reject(userId: bigint, matchId: number) {
    if (!Number.isFinite(matchId) || matchId <= 0) {
      throw new BadRequestException("invalid match id");
    }

    const match = await this.prisma.match.findUnique({
      where: { matchId: BigInt(matchId) },
      include: {
        resource: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!match || match.resource.userId !== userId) {
      throw new BadRequestException("match record not found");
    }

    const updated = await this.prisma.match.update({
      where: { matchId: match.matchId },
      data: { status: MatchStatus.invalid }
    });

    return {
      matchId: Number(updated.matchId),
      status: updated.status
    };
  }

  private resolveNeedProfile(payload: RunMatchDto): NeedProfile {
    const hasManualDimensions =
      (payload.locationTags?.length ?? 0) > 0 ||
      (payload.skillTags?.length ?? 0) > 0 ||
      (payload.timeTags?.length ?? 0) > 0 ||
      payload.minPrice !== undefined ||
      payload.maxPrice !== undefined;

    if (!hasManualDimensions) {
      const cached = this.needProfileCache.get(payload.needId);
      if (cached && new Date(cached.nextCollectionAt).getTime() > Date.now()) {
        return cached;
      }
      return this.collectNeedProfile(payload.needId);
    }

    const now = new Date();
    const minPrice = payload.minPrice ?? 0;
    const maxPrice = payload.maxPrice ?? Math.max(minPrice + 1000, 999999);

    const profile: NeedProfile = {
      needId: payload.needId,
      locationTags: this.uniqueTokens(payload.locationTags ?? []),
      skillTags: this.uniqueTokens(payload.skillTags ?? []),
      timeTags: this.uniqueTokens(payload.timeTags ?? []),
      priceRange: {
        min: Math.min(minPrice, maxPrice),
        max: Math.max(minPrice, maxPrice)
      },
      collectedAt: now.toISOString(),
      nextCollectionAt: new Date(
        now.getTime() + NEED_COLLECTION_INTERVAL_HOURS * 60 * 60 * 1000
      ).toISOString(),
      nextPushAt: this.nextPushTime().toISOString(),
      source: "manual-input"
    };

    this.needProfileCache.set(payload.needId, profile);
    return profile;
  }

  private collectNeedProfile(needId: number): NeedProfile {
    const now = new Date();
    const locationTag = LOCATION_POOL[needId % LOCATION_POOL.length] ?? LOCATION_POOL[0];
    const secondLocationTag =
      LOCATION_POOL[(needId + 2) % LOCATION_POOL.length] ?? LOCATION_POOL[1];
    const skillTag = SKILL_POOL[needId % SKILL_POOL.length] ?? SKILL_POOL[0];
    const secondSkillTag = SKILL_POOL[(needId + 3) % SKILL_POOL.length] ?? SKILL_POOL[1];
    const timeTag = TIME_POOL[needId % TIME_POOL.length] ?? TIME_POOL[0];

    const profile: NeedProfile = {
      needId,
      locationTags: this.uniqueTokens([locationTag, secondLocationTag]),
      skillTags: this.uniqueTokens([skillTag, secondSkillTag]),
      timeTags: this.uniqueTokens([timeTag]),
      priceRange: {
        min: 500 + (needId % 6) * 200,
        max: 1800 + (needId % 6) * 350
      },
      collectedAt: now.toISOString(),
      nextCollectionAt: new Date(
        now.getTime() + NEED_COLLECTION_INTERVAL_HOURS * 60 * 60 * 1000
      ).toISOString(),
      nextPushAt: this.nextPushTime().toISOString(),
      source: "public-compliant-source"
    };

    this.needProfileCache.set(needId, profile);
    return profile;
  }

  private normalizeTags(value: Prisma.JsonValue | null): string[] {
    const values = this.flattenJsonValue(value);
    return this.uniqueTokens(values);
  }

  private flattenJsonValue(value: Prisma.JsonValue | null): string[] {
    if (value === null || value === undefined) {
      return [];
    }
    if (typeof value === "string") {
      const token = value.trim();
      return token ? [token] : [];
    }
    if (typeof value === "number") {
      return [String(value)];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.flattenJsonValue(item));
    }
    if (typeof value === "object") {
      return Object.values(value).flatMap((item) =>
        this.flattenJsonValue(item as Prisma.JsonValue)
      );
    }
    return [];
  }

  private extractLocationTags(areaCode: string | null, tags: string[]): string[] {
    const raw = [...tags, areaCode ?? ""];
    return this.uniqueTokens(
      raw.filter((token) =>
        LOCATION_POOL.some((location) => token.toLowerCase().includes(location))
      )
    );
  }

  private extractTimeTags(tags: string[]): string[] {
    return this.uniqueTokens(
      tags.filter((token) => TIME_POOL.some((time) => token.toLowerCase().includes(time)))
    );
  }

  private extractSkillTags(tags: string[]): string[] {
    return this.uniqueTokens(
      tags.filter((token) => {
        const normalized = token.toLowerCase();
        const isLocation = LOCATION_POOL.some((location) => normalized.includes(location));
        const isTime = TIME_POOL.some((time) => normalized.includes(time));
        return !isLocation && !isTime;
      })
    );
  }

  private parsePriceRange(value: Prisma.JsonValue | null): PriceRange | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const maybeMin = Number((value as Record<string, unknown>).min);
    const maybeMax = Number((value as Record<string, unknown>).max);
    if (!Number.isFinite(maybeMin) || !Number.isFinite(maybeMax)) {
      return null;
    }

    return {
      min: Math.min(maybeMin, maybeMax),
      max: Math.max(maybeMin, maybeMax)
    };
  }

  private calcOverlapScore(source: string[], target: string[]): number {
    if (source.length === 0) {
      return 100;
    }
    if (target.length === 0) {
      return 0;
    }

    const targetSet = new Set(target.map((item) => item.toLowerCase()));
    const matched = source.filter((item) => targetSet.has(item.toLowerCase())).length;
    const ratio = matched / source.length;
    return Math.round(ratio * 100);
  }

  private calcPriceScore(needRange: PriceRange, resourceRange: PriceRange | null): number {
    if (!resourceRange) {
      return 60;
    }

    const overlapMin = Math.max(needRange.min, resourceRange.min);
    const overlapMax = Math.min(needRange.max, resourceRange.max);
    if (overlapMax < overlapMin) {
      return 0;
    }

    const overlap = overlapMax - overlapMin;
    const demandSpan = Math.max(1, needRange.max - needRange.min);
    return Math.round((overlap / demandSpan) * 100);
  }

  private nextPushTime(): Date {
    const now = new Date();
    const push = new Date(now);
    push.setHours(8, 0, 0, 0);

    if (push.getTime() <= now.getTime()) {
      push.setDate(push.getDate() + 1);
    }

    return push;
  }

  private buildVirtualContact(matchId: number): string {
    return `relay-${String(matchId).padStart(6, "0")}@airp.local`;
  }

  private maskContact(rawPhone: string | null | undefined): string {
    if (!rawPhone) {
      return "available after confirmation";
    }

    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length >= 11) {
      return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
    }

    return "available after confirmation";
  }

  private uniqueTokens(tokens: string[]): string[] {
    const normalized = tokens
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => item.toLowerCase());

    return Array.from(new Set(normalized));
  }

  private toTwoDecimals(value: number): number {
    return Number(value.toFixed(2));
  }
}
