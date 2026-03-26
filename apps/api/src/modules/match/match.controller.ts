import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { MatchService } from "./match.service";
import { RunMatchDto } from "./dto/match.dto";

@Controller("match")
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post("run")
  run(@Body() payload: RunMatchDto) {
    return ok(this.matchService.run(payload), "匹配任务已创建");
  }

  @Get("list")
  list() {
    return ok(this.matchService.list());
  }

  @Post(":id/confirm")
  confirm(@Param("id") id: string) {
    return ok(this.matchService.confirm(Number(id)), "匹配已确认");
  }
}
