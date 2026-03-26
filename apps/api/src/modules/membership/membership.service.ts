import { Injectable } from "@nestjs/common";

@Injectable()
export class MembershipService {
  plans() {
    return [
      { code: "free", name: "免费版", price: 0 },
      { code: "monthly", name: "月度会员", price: 99 },
      { code: "yearly", name: "年度会员", price: 899 },
      { code: "lifetime", name: "终身版", price: 1999 }
    ];
  }
}
