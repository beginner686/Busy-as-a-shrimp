import { Injectable } from "@nestjs/common";
import { ComplianceProvider, ComplianceResult } from "./base.provider";

@Injectable()
export class LocalComplianceProvider extends ComplianceProvider {
  /**
   * 强化敏感词库
   */
  private readonly sensitiveWords: string[] = [
    "违规",
    "禁止",
    "色情",
    "暴力",
    "博彩",
    "外网",
    "联系方式",
    "微信号",
    "QQ号",
    "加我",
    "私下交易",
    "代刷",
    "套现",
    "虚假宣传",
    "欺诈",
    "枪支",
    "毒品"
  ];

  async checkText(content: string): Promise<ComplianceResult> {
    const found = this.sensitiveWords.find((word) => content.includes(word));
    if (found) {
      return {
        success: false,
        message: `内容包含敏感词汇: ${found}`,
        suggestion: "block"
      };
    }
    return { success: true, suggestion: "pass" };
  }

  async checkImage(image: string): Promise<ComplianceResult> {
    /**
     * 目前不介入真实的 OCR，后期上线时对接云端 OCR 扫描。
     * 仅进行基本链接检查。
     */
    if (!image.startsWith("http") && !image.startsWith("base64")) {
      return {
        success: false,
        message: "无效的图片路径或格式",
        suggestion: "block"
      };
    }
    return { success: true, suggestion: "pass" };
  }

  getName(): string {
    return "local-keyword-scanner";
  }
}
