import { Body, Controller, Param, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { ContentService } from "./content.service";
import { CreateContentDto } from "./dto/content.dto";

@Controller("content")
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post("generate")
  generate(@Body() payload: CreateContentDto) {
    return ok(this.contentService.create(payload), "内容已生成，等待确认");
  }

  @Post(":id/publish")
  publish(@Param("id") id: string) {
    return ok(this.contentService.publish(Number(id)), "内容已发布");
  }
}

