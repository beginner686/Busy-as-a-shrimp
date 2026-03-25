import { Injectable } from "@nestjs/common";

@Injectable()
export class ComplianceService {
  rules() {
    return {
      uploadFirewall: true,
      contentPreCheck: true,
      dealIsolation: true,
      antiFraud: ["same_ip_limit", "abnormal_device", "invite_chain_detection"]
    };
  }
}

