import { Injectable } from "@nestjs/common";
import { UpdateResourceDto, UploadResourceDto } from "./dto/resource.dto";

@Injectable()
export class ResourceService {
  upload(payload: UploadResourceDto) {
    return {
      resourceId: 20001,
      reviewStatus: "pending",
      ...payload
    };
  }

  list() {
    return [
      {
        resourceId: 20001,
        resourceType: "skill",
        tags: ["短视频", "探店"],
        status: "active"
      }
    ];
  }

  update(id: number, payload: UpdateResourceDto) {
    return {
      updated: true,
      resourceId: id,
      ...payload
    };
  }

  remove(id: number) {
    return {
      deleted: true,
      resourceId: id
    };
  }

  tags() {
    return ["地区", "技能", "时间", "规模"];
  }
}

