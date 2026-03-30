import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { ContentService } from "./content.service";
import { CreateContentDto } from "./dto/content.dto";

@Controller("content")
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post("generate")
  async generate(@Req() req: { user?: { userId: string } }, @Body() payload: CreateContentDto) {
    const userId = req.user?.userId ? BigInt(req.user.userId) : 1n; // 使用 1n 作为 Mock 测试 ID
    return ok(await this.contentService.create(userId, payload), "内容已生成，等待确认");
  }

  @Post(":id/publish")
  publish(@Param("id") id: string) {
    return ok(this.contentService.publish(Number(id)), "内容已发布");
  }
}
