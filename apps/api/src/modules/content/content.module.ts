import { Module } from "@nestjs/common";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { DoppelgangerModule } from "../doppelganger/doppelganger.module";

@Module({
  imports: [DoppelgangerModule],
  controllers: [ContentController],
  providers: [ContentService]
})
export class ContentModule {}
