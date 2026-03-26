import { Controller, Get } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { ComplianceService } from "./compliance.service";

@Controller("compliance")
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get("rules")
  rules() {
    return ok(this.complianceService.rules());
  }
}
