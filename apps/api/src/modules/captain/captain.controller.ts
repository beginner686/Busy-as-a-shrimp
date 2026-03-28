import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { CaptainService } from "./captain.service";
import { WithdrawDto } from "./dto/captain.dto";

interface AuthUser {
  userId: bigint | string;
  role: string;
}

@Controller("captain")
@UseGuards(JwtAuthGuard)
export class CaptainController {
  constructor(private readonly captainService: CaptainService) {}

  @Get("info")
  async info(@CurrentUser() user: AuthUser) {
    return ok(await this.captainService.info(BigInt(user.userId)));
  }

  @Get("ranking")
  async ranking() {
    return ok(await this.captainService.ranking());
  }

  @Get("commissions")
  async commissions(@CurrentUser() user: AuthUser) {
    return ok(await this.captainService.commissions(BigInt(user.userId)));
  }

  @Post("withdraw")
  async withdraw(@CurrentUser() user: AuthUser, @Body() payload: WithdrawDto) {
    return ok(
      await this.captainService.withdraw(BigInt(user.userId), payload),
      "withdraw request submitted"
    );
  }

  @Get("stats")
  async stats(@CurrentUser() user: AuthUser) {
    return ok(await this.captainService.stats(BigInt(user.userId)));
  }
}
