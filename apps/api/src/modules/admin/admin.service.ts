import { Injectable } from "@nestjs/common";

@Injectable()
export class AdminService {
  users() {
    return [{ userId: 10001, status: "active" }];
  }

  resources() {
    return [{ resourceId: 20001, reviewStatus: "pending" }];
  }

  reviewResource(id: number, decision: "approve" | "reject") {
    return {
      resourceId: id,
      status: decision === "approve" ? "active" : "rejected"
    };
  }

  stats() {
    return {
      totalUsers: 1024,
      totalResources: 488,
      matchRate: 0.71
    };
  }

  announce(content: string) {
    return {
      noticeId: `notice-${Date.now()}`,
      content
    };
  }

  captainRanking() {
    return [{ captainId: 10010, level: "gold", score: 98 }];
  }

  updateCaptainLevel(id: number, level: "normal" | "advanced" | "gold") {
    return {
      captainId: id,
      level
    };
  }
}

