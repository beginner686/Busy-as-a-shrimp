import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { UserModule } from "./modules/user/user.module";
import { ResourceModule } from "./modules/resource/resource.module";
import { MatchModule } from "./modules/match/match.module";
import { ContentModule } from "./modules/content/content.module";
import { CaptainModule } from "./modules/captain/captain.module";
import { MembershipModule } from "./modules/membership/membership.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    UserModule,
    ResourceModule,
    MatchModule,
    ContentModule,
    CaptainModule,
    MembershipModule,
    AdminModule,
    ComplianceModule
  ]
})
export class AppModule {}
