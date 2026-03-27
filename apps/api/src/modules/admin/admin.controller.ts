import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { AdminAuthGuard } from "./auth/admin-auth.guard";
import { AdminAuthService } from "./auth/admin-auth.service";
import { Public } from "./auth/public.decorator";
import { AdminService } from "./admin.service";
import {
  AdminLoginDto,
  PublishAnnouncementDto,
  QueryResourcesDto,
  QueryUsersDto,
  ReviewResourceDto,
  UpdateCaptainLevelDto,
  UpdateUserStatusDto,
  CaptainLevel
} from "./dto/admin.dto";

@UseGuards(AdminAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminAuthService: AdminAuthService
  ) {}

  @Public()
  @Post("login")
  login(@Body() payload: AdminLoginDto) {
    return ok(this.adminAuthService.login(payload), "Admin login success");
  }

  @Get("me")
  me(@Req() request: { admin?: unknown }) {
    return ok(request.admin ?? null);
  }

  @Get("users")
  async users(@Query() query: QueryUsersDto) {
    return ok(await this.adminService.users(query));
  }

  @Put("users/:id/status")
  async updateUserStatus(@Param("id") id: string, @Body() payload: UpdateUserStatusDto) {
    return ok(
      await this.adminService.updateUserStatus(Number(id), payload.status),
      "User status updated"
    );
  }

  @Get("resources")
  async resources(@Query() query: QueryResourcesDto) {
    return ok(await this.adminService.resources(query));
  }

  @Put("resources/:id")
  async reviewResource(@Param("id") id: string, @Body() payload: ReviewResourceDto) {
    return ok(
      await this.adminService.reviewResource(Number(id), payload.decision, payload.reason),
      "Resource review completed"
    );
  }

  @Get("stats")
  async stats() {
    return ok(await this.adminService.stats());
  }

  @Post("announce")
  async announce(@Body() payload: PublishAnnouncementDto) {
    return ok(
      await this.adminService.announce(payload.content, payload.publisher || "admin"),
      "Announcement published"
    );
  }

  @Get("announcements")
  async announcements() {
    return ok(await this.adminService.announcements());
  }

  @Get("captain/ranking")
  async captainRanking() {
    return ok(await this.adminService.captainRanking());
  }

  @Put("captain/:id/level")
  async updateCaptainLevel(@Param("id") id: string, @Body() payload: UpdateCaptainLevelDto) {
    return ok(
      await this.adminService.updateCaptainLevel(Number(id), payload.level as CaptainLevel),
      "Captain level updated"
    );
  }
}
