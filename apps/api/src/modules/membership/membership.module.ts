import { Module } from "@nestjs/common";
import { MembershipController } from "./membership.controller";
import { MembershipService } from "./membership.service";
import { PrismaService } from "../../common/prisma.service";

import { DoppelgangerModule } from "../doppelganger/doppelganger.module";

@Module({
  imports: [DoppelgangerModule],
  controllers: [MembershipController],
  providers: [MembershipService, PrismaService],
  exports: [MembershipService]
})
export class MembershipModule {}
