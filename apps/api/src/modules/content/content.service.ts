import { Injectable } from "@nestjs/common";
import { CreateContentDto } from "./dto/content.dto";

@Injectable()
export class ContentService {
  create(payload: CreateContentDto) {
    return {
      contentId: 50001,
      status: "draft",
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

