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
        tags: ["short-video", "store-visit"],
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
    return ["region", "skill", "time", "scale"];
  }
}
