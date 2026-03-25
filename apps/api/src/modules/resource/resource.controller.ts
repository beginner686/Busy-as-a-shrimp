import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { ResourceService } from "./resource.service";
import { UpdateResourceDto, UploadResourceDto } from "./dto/resource.dto";

@Controller("resource")
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Post("upload")
  upload(@Body() payload: UploadResourceDto) {
    return ok(this.resourceService.upload(payload), "资源上传成功，待审核");
  }

  @Get("list")
  list() {
    return ok(this.resourceService.list());
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() payload: UpdateResourceDto) {
    return ok(this.resourceService.update(Number(id), payload), "资源已更新");
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return ok(this.resourceService.remove(Number(id)), "资源已删除");
  }

  @Get("tags")
  tags() {
    return ok(this.resourceService.tags());
  }
}

