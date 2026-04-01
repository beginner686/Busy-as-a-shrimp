import { Injectable, ForbiddenException, BadRequestException } from "@nestjs/common";
import { MemberLevel, PointTransType, SubmissionStatus, TaskStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doppelgangerService: DoppelgangerService
  ) {}

  async listTasks() {
    return this.prisma.bountyTask.findMany({
      where: { status: TaskStatus.PUBLISHED },
      orderBy: { createdAt: "desc" }
    });
  }

  async getTask(userId: bigint, taskId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new BadRequestException("用户不存在");

    const task = await this.prisma.bountyTask.findUnique({ where: { taskId } });
    if (!task) throw new BadRequestException("任务不存在");

    if (user.memberLevel === MemberLevel.free) {
      if (user.taskViewCount >= 5) {
        throw new ForbiddenException(
          "免费查看详细任务详情的额度（5次）已用完，请订阅会员解锁全部任务。"
        );
      }

      await this.prisma.user.update({
        where: { userId },
        data: { taskViewCount: { increment: 1 } }
      });
    }

    const taskData = { ...task };
    if (user.memberLevel === MemberLevel.free) {
      taskData.content = taskData.content.substring(0, 20) + "... (订阅会员查看完整需求)";
    }

    return taskData;
  }

  async applyTask(userId: bigint, taskId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new BadRequestException("用户不存在");

    if (user.memberLevel === MemberLevel.free) {
      if (user.taskAcceptCount >= 1) {
        throw new ForbiddenException(
          "您的免费接取任务机会（1次）已用完，请充值订阅会员以解除限制并接取更多任务。"
        );
      }
    } else if (user.memberExpire && user.memberExpire < new Date()) {
      throw new ForbiddenException("会员已过期，请续费后继续领取任务。");
    }

    const task = await this.prisma.bountyTask.findUnique({ where: { taskId } });
    if (!task || task.status !== TaskStatus.PUBLISHED)
      throw new BadRequestException("该任务不存在或已结束。");

    const existing = await this.prisma.taskSubmission.findFirst({ where: { userId, taskId } });
    if (existing) throw new BadRequestException("你已经申请过该任务。");

    return this.prisma.$transaction(async (tx) => {
      if (user.memberLevel === MemberLevel.free) {
        await tx.user.update({
          where: { userId },
          data: { taskAcceptCount: { increment: 1 } }
        });
      }

      return tx.taskSubmission.create({
        data: { userId, taskId, status: SubmissionStatus.PENDING }
      });
    });
  }

  async submitProof(userId: bigint, submissionId: bigint, proof: string) {
    const submission = await this.prisma.taskSubmission.findUnique({ where: { submissionId } });
    if (!submission || submission.userId !== userId)
      throw new ForbiddenException("无权操作此申请。");
    return this.prisma.taskSubmission.update({ where: { submissionId }, data: { proof } });
  }

  async approveSubmission(submissionId: bigint) {
    const submission = await this.prisma.taskSubmission.findUnique({
      where: { submissionId },
      include: { task: true }
    });
    if (!submission || submission.status !== SubmissionStatus.PENDING)
      throw new BadRequestException("申请不存在或状态不正确。");

    return this.prisma.$transaction(async (tx) => {
      await tx.taskSubmission.update({
        where: { submissionId },
        data: { status: SubmissionStatus.APPROVED }
      });
      return this.doppelgangerService.addPoints(
        submission.userId,
        Number(submission.task.points),
        PointTransType.TASK_REWARD,
        { taskId: Number(submission.taskId), submissionId: Number(submission.submissionId) }
      );
    });
  }
}
