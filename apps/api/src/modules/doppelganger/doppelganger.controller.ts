import { Controller, Get, Post, Body, Req } from "@nestjs/common";
import { DoppelgangerService } from "./doppelganger.service";

@Controller("doppelganger")
export class DoppelgangerController {
  constructor(private readonly doppelgangerService: DoppelgangerService) {}

  @Get("me")
  async getMyDoppelganger(@Req() req: { user: { userId: string } }) {
    // Note: Assuming AuthGuard and userId availability. Using req.user.userId
    const userId = BigInt(req.user.userId);
    return this.doppelgangerService.getDoppelganger(userId);
  }

  @Post("consume")
  async consumeTokens(
    @Req() req: { user: { userId: string } },
    @Body() body: { amount: number; metadata?: Record<string, unknown> }
  ) {
    const userId = BigInt(req.user.userId);
    return this.doppelgangerService.consumePoints(userId, body.amount, body.metadata);
  }
}
