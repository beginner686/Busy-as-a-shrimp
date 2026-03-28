import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { CaptainController } from "./captain.controller";
import { CaptainService } from "./captain.service";

@Module({
  controllers: [CaptainController],
  providers: [CaptainService, PrismaService]
})
export class CaptainModule {}
