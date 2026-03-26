import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      const canStartWithoutDb = process.env.ALLOW_API_WITHOUT_DB === "1";
      if (!canStartWithoutDb) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database connection skipped: ${message}`);
    }
  }
}
