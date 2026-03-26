import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { ResourceService } from "./resource.service";
import { UpdateResourceDto, UploadResourceDto } from "./dto/resource.dto";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { User } from "@prisma/client";

@Controller("resource")
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @UseGuards(JwtAuthGuard)
  @Post("upload")
  async upload(@CurrentUser() user: User, @Body() payload: UploadResourceDto) {
    const resource = await this.resourceService.upload(user.userId, payload);
    return ok(resource, "资源上传成功，待审核");
  }

  @UseGuards(JwtAuthGuard)
  @Get("list")
  async list(@CurrentUser() user: User) {
    const resources = await this.resourceService.list(user.userId);
    return ok(resources);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  async update(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() payload: UpdateResourceDto
  ) {
    const resource = await this.resourceService.update(Number(id), user.userId, payload);
    return ok(resource, "资源已更新");
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: User) {
    await this.resourceService.remove(Number(id), user.userId);
    return ok(null, "资源已删除");
  }

  @Get("tags")
  async tags() {
    const tags = await this.resourceService.tags();
    return ok(tags);
  }
}
