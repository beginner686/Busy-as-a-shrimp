import { Injectable, Logger } from "@nestjs/common";
import { CreateContentDto } from "./dto/content.dto";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly doppelgangerService: DoppelgangerService) {}

  async create(userId: bigint, payload: CreateContentDto) {
    // 模拟 AI 生成过程并获取 Token 消耗
    const mockTokens = 1500; // 假设消耗了 1500 tokens
    const pointCost = mockTokens / 1000; // 假设 1000 token = 1 元 = 1 积分

    this.logger.log(`User ${userId} consuming ${pointCost} points for ${mockTokens} tokens`);

    // 扣除积分
    await this.doppelgangerService.consumePoints(userId, pointCost, {
      action: "CONTENT_GENERATION",
      tokens: mockTokens,
      platform: payload.targetPlatform
    });

    return {
      contentId: 50001,
      status: "draft",
      tokensConsumed: mockTokens,
      pointsDeducted: pointCost,
      generatedBody: `Mock content for ${payload.targetPlatform}`
    };
  }

  publish(id: number) {
    return {
      contentId: id,
      status: "published"
    };
  }
}
