import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("*/api/v1/user/captcha", () => {
    return HttpResponse.json({
      success: true,
      message: "图形验证码已生成",
      data: {
        captchaId: "mock-captcha-id",
        imageBase64:
          "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiIGZpbGw9IiNmOGZhZmMiLz48dGV4dCB4PSIyMCIgeT0iMjgiIGZvbnQtc2l6ZT0iMjAiPkExQjI8L3RleHQ+PC9zdmc+"
      }
    });
  }),
  http.post("*/api/v1/user/send-sms", async () => {
    return HttpResponse.json({
      success: true,
      message: "短信发送成功",
      data: {
        success: true,
        message: "验证码已发送",
        code: "123456"
      }
    });
  }),
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
  http.get("*/api/v1/resource/tags", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: {
        skill: ["短视频", "直播", "探店"],
        location: ["上海", "北京", "杭州"],
        time: ["长期", "短期"]
      }
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
