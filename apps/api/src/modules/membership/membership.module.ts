import { Module } from "@nestjs/common";
import { MembershipController } from "./membership.controller";
import { MembershipService } from "./membership.service";

import { DoppelgangerModule } from "../doppelganger/doppelganger.module";

@Module({
  imports: [DoppelgangerModule],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService]
})
export class MembershipModule {}
