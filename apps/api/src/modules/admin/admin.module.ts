import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAuthService } from "./auth/admin-auth.service";
import { AdminAuthGuard } from "./auth/admin-auth.guard";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminAuthService, AdminAuthGuard]
})
export class AdminModule {}
