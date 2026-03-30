import { Module, Global } from "@nestjs/common";
import { ComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";
import { LocalComplianceProvider } from "./providers/local.provider";

@Global()
@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService, LocalComplianceProvider],
  exports: [ComplianceService]
})
export class ComplianceModule {}
