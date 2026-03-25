import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  users() {
    return ok(this.adminService.users());
  }

  @Get("resources")
  resources() {
    return ok(this.adminService.resources());
  }

  @Put("resources/:id")
  reviewResource(
    @Param("id") id: string,
    @Body("decision") decision: "approve" | "reject"
  ) {
    return ok(this.adminService.reviewResource(Number(id), decision), "审核完成");
  }

  @Get("stats")
  stats() {
    return ok(this.adminService.stats());
  }

  @Post("announce")
  announce(@Body("content") content: string) {
    return ok(this.adminService.announce(content), "公告已发布");
  }

  @Get("captain/ranking")
  captainRanking() {
    return ok(this.adminService.captainRanking());
  }

  @Put("captain/:id/level")
  updateCaptainLevel(
    @Param("id") id: string,
    @Body("level") level: "normal" | "advanced" | "gold"
  ) {
    return ok(this.adminService.updateCaptainLevel(Number(id), level), "团长等级已更新");
  }
}
