import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
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
  UpdateUserStatusDto
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
  users(@Query() query: QueryUsersDto) {
    return ok(this.adminService.users(query));
  }

  @Put("users/:id/status")
  updateUserStatus(@Param("id") id: string, @Body() payload: UpdateUserStatusDto) {
    return ok(
      this.adminService.updateUserStatus(Number(id), payload.status),
      "User status updated"
    );
  }

  @Get("resources")
  resources(@Query() query: QueryResourcesDto) {
    return ok(this.adminService.resources(query));
  }

  @Put("resources/:id")
  reviewResource(@Param("id") id: string, @Body() payload: ReviewResourceDto) {
    return ok(
      this.adminService.reviewResource(Number(id), payload.decision, payload.reason),
      "Resource review completed"
    );
  }

  @Get("stats")
  stats() {
    return ok(this.adminService.stats());
  }

  @Post("announce")
  announce(@Body() payload: PublishAnnouncementDto) {
    return ok(
      this.adminService.announce(payload.content, payload.publisher),
      "Announcement published"
    );
  }

  @Get("announcements")
  announcements() {
    return ok(this.adminService.announcements());
  }

  @Get("captain/ranking")
  captainRanking() {
    return ok(this.adminService.captainRanking());
  }

  @Put("captain/:id/level")
  updateCaptainLevel(@Param("id") id: string, @Body() payload: UpdateCaptainLevelDto) {
    return ok(
      this.adminService.updateCaptainLevel(Number(id), payload.level),
      "Captain level updated"
    );
  }
}
