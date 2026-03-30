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

  async getTask(taskId: bigint) {
    return this.prisma.bountyTask.findUnique({
      where: { taskId }
    });
  }

  async applyTask(userId: bigint, taskId: bigint) {
    // 1. Check User Membership
    const user = await this.prisma.user.findUnique({
      where: { userId }
    });

    if (!user || user.memberLevel === MemberLevel.free) {
      throw new ForbiddenException(
        "只有订阅会员（月度/年度/终身）才能领取悬赏任务，请先前往订阅。"
      );
    }

    if (user.memberExpire && user.memberExpire < new Date()) {
      throw new ForbiddenException("会员已过期，请续费后继续领取任务。");
    }

    // 2. Check Task Existence
    const task = await this.prisma.bountyTask.findUnique({
      where: { taskId }
    });

    if (!task || task.status !== TaskStatus.PUBLISHED) {
      throw new BadRequestException("该任务不存在或已结束。");
    }

    // 3. Check if already submitted/applied
    const existing = await this.prisma.taskSubmission.findFirst({
      where: { userId, taskId }
    });

    if (existing) {
      throw new BadRequestException("你已经申请过该任务。");
    }

    // 4. Create initial pending submission (Application)
    return this.prisma.taskSubmission.create({
      data: {
        userId,
        taskId,
        status: SubmissionStatus.PENDING
      }
    });
  }

  async submitProof(userId: bigint, submissionId: bigint, proof: string) {
    const submission = await this.prisma.taskSubmission.findUnique({
      where: { submissionId }
    });

    if (!submission || submission.userId !== userId) {
      throw new ForbiddenException("无权操作此申请。");
    }

    return this.prisma.taskSubmission.update({
      where: { submissionId },
      data: { proof }
    });
  }

  async approveSubmission(submissionId: bigint) {
    const submission = await this.prisma.taskSubmission.findUnique({
      where: { submissionId },
      include: { task: true }
    });

    if (!submission || submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException("申请不存在或状态不正确。");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update submission status
      await tx.taskSubmission.update({
        where: { submissionId },
        data: { status: SubmissionStatus.APPROVED }
      });

      // 2. Add points
      return this.doppelgangerService.addPoints(
        submission.userId,
        Number(submission.task.points),
        PointTransType.TASK_REWARD,
        { taskId: Number(submission.taskId), submissionId: Number(submission.submissionId) }
      );
    });
  }
}
