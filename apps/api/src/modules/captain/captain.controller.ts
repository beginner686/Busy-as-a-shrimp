import { Body, Controller, Get, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CaptainService } from "./captain.service";

@Controller("captain")
export class CaptainController {
  constructor(private readonly captainService: CaptainService) {}

  @Get("info")
  info() {
    return ok(this.captainService.info());
  }

  @Get("ranking")
  ranking() {
    return ok(this.captainService.ranking());
  }

  @Get("commissions")
  commissions() {
    return ok(this.captainService.commissions());
  }

  @Post("withdraw")
  withdraw(@Body("amount") amount: number) {
    return ok(this.captainService.withdraw(amount), "提现申请已提交");
  }

  @Get("stats")
  stats() {
    return ok(this.captainService.stats());
  }
}

