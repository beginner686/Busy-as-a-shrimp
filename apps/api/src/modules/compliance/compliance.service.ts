import { Injectable, BadRequestException } from "@nestjs/common";
import { LocalComplianceProvider } from "./providers/local.provider";

@Injectable()
export class ComplianceService {
  constructor(private readonly localProvider: LocalComplianceProvider) {}

  /**
   * 检查文本是否合规
   */
  async checkText(content: string): Promise<void> {
    const result = await this.localProvider.checkText(content);
    if (!result.success) {
      throw new BadRequestException(result.message || "内容未通过合规审查");
    }
  }

  /**
   * 检查图片标识是否合规
   */
  async checkImage(image: string): Promise<void> {
    const result = await this.localProvider.checkImage(image);
    if (!result.success) {
      throw new BadRequestException(result.message || "图片未通过合规审查");
    }
  }

  /**
   * 批量检查标签
   */
  async checkTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.checkText(tag);
    }
  }

  /**
   * 返回合规规则配置
   */
  rules() {
    return {
      uploadFirewall: true,
      contentPreCheck: true,
      dealIsolation: true,
      antiFraud: ["same_ip_limit", "abnormal_device", "invite_chain_detection"],
      scanEngine: this.localProvider.getName()
    };
  }
}
