import { Injectable } from "@nestjs/common";
import { RunMatchDto } from "./dto/match.dto";

@Injectable()
export class MatchService {
  run(payload: RunMatchDto) {
    return {
      taskId: `match-${Date.now()}`,
      needId: payload.needId,
      status: "queued"
    };
  }

  list() {
    return [
      {
        matchId: 30001,
        needId: 90001,
        resourceId: 20001,
        score: 92.5,
        status: "pushed"
      }
    ];
  }

  confirm(id: number) {
    return {
      matchId: id,
      status: "confirmed"
    };
  }
}
