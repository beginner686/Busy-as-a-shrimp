import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("*/api/v1/user/register", async () => {
    return HttpResponse.json({
      success: true,
      message: "注册成功",
      data: {
        registered: true,
        userId: 10086
      }
    });
  }),
  http.post("*/api/v1/user/login", async () => {
    return HttpResponse.json({
      success: true,
      message: "登录成功",
      data: {
        token: "msw-token",
        loginType: "phone"
      }
    });
  }),
  http.get("*/api/v1/user/info", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: {
        userId: 1,
        role: "both",
        city: "Shanghai"
      }
    });
  }),
  http.put("*/api/v1/user/info", async () => {
    return HttpResponse.json({
      success: true,
      message: "用户信息已更新",
      data: {
        updated: true
      }
    });
  }),
  http.put("*/api/v1/user/role", async () => {
    return HttpResponse.json({
      success: true,
      message: "角色已切换",
      data: {
        updated: true,
        role: "both"
      }
    });
  }),
  http.post("*/api/v1/resource/upload", async () => {
    return HttpResponse.json({
      success: true,
      message: "资源上传成功",
      data: {
        resourceId: 20088,
        reviewStatus: "pending"
      }
    });
  }),
  http.get("*/api/v1/resource/list", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: []
    });
  }),
  http.get("*/api/v1/match/list", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: [
        {
          matchId: 30001,
          needId: 90001,
          resourceId: 20001,
          score: 91.2,
          status: "pushed"
        }
      ]
    });
  }),
  http.post("*/api/v1/match/run", async () => {
    return HttpResponse.json({
      success: true,
      message: "匹配任务已创建",
      data: {
        taskId: "match-msw",
        status: "queued"
      }
    });
  }),
  http.post("*/api/v1/match/:id/confirm", ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: "匹配已确认",
      data: {
        matchId: Number(params.id),
        status: "confirmed"
      }
    });
  })
];
