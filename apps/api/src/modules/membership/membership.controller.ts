import { Controller, Get } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { MembershipService } from "./membership.service";

@Controller("membership")
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get("plans")
  plans() {
    return ok(this.membershipService.plans());
  }
}
