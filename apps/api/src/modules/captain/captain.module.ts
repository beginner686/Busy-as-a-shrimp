import { Module } from "@nestjs/common";
import { CaptainController } from "./captain.controller";
import { CaptainService } from "./captain.service";

@Module({
  controllers: [CaptainController],
  providers: [CaptainService]
})
export class CaptainModule {}
