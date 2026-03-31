import { Controller, Get, Post, Param, Body, Req, UseGuards } from "@nestjs/common";
import { TaskService } from "./task.service";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { MembershipAccessGuard } from "../membership/guards/membership-access.guard";
import { RequireMember } from "../membership/decorators/require-member.decorator";

@Controller("tasks")
@UseGuards(JwtAuthGuard, MembershipAccessGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

   @Get()
  async list() {
    return this.taskService.listTasks();
  }

  @Get(":id")
  @RequireMember()
  async get(@Param("id") id: string, @Req() req: { user: { userId: string } }) {
    const userId = BigInt(req.user.userId);
    return this.taskService.getTask(userId, BigInt(id));
  }

  @Post(":id/apply")
  async apply(@Param("id") id: string, @Req() req: { user: { userId: string } }) {
    // 权限校验会在 service 中处理：memberLevel !== 'free'
    const userId = BigInt(req.user.userId);
    return this.taskService.applyTask(userId, BigInt(id));
  }

  @Post(":id/submit")
  async submit(
    @Param("id") id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { proof: string }
  ) {
    const userId = BigInt(req.user.userId);
    return this.taskService.submitProof(userId, BigInt(id), body.proof);
  }
}
