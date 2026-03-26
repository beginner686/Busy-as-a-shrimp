import { Injectable } from "@nestjs/common";

@Injectable()
export class CaptainService {
  info() {
    return {
      level: "normal",
      commissionRate: 0.6,
      inviteCode: "AB12CD"
    };
  }

  ranking() {
    return [
      { rank: 1, captainId: 10010, score: 98 },
      { rank: 2, captainId: 10011, score: 95 }
    ];
  }

  commissions() {
    return [
      {
        commissionId: 70001,
        orderAmount: 99,
        commissionRate: 0.6,
        commissionAmount: 59.4,
        status: "pending"
      }
    ];
  }

  withdraw(amount: number) {
    return {
      requestId: `wd-${Date.now()}`,
      amount,
      status: "submitted"
    };
  }

  stats() {
    return {
      todayInvites: 2,
      monthInvites: 18,
      validInvites: 12
    };
  }
}
