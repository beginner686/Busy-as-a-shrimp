import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAuthService } from "./auth/admin-auth.service";
import { AdminAuthGuard } from "./auth/admin-auth.guard";
import { PrismaService } from "../../common/prisma.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminAuthService, AdminAuthGuard, PrismaService]
})
export class AdminModule {}
