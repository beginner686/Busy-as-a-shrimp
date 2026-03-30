export interface ComplianceResult {
  success: boolean;
  message?: string;
  suggestion?: "pass" | "block" | "review";
}

export abstract class ComplianceProvider {
  /**
   * 检查文本内容是否合规
   * @param content 待检查的文本
   */
  abstract checkText(content: string): Promise<ComplianceResult>;

  /**
   * 检查图片 URL 或 Base64 是否合规
   * @param image 待检查的图片标识
   */
  abstract checkImage(image: string): Promise<ComplianceResult>;

  /**
   * 获取 Provider 名称
   */
  abstract getName(): string;
}
