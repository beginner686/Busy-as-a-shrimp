import { describe, expect, it, vi } from "vitest";
import { createUserApi } from "../user-api";

describe("createUserApi", () => {
  it("calls register endpoint with payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ registered: true, userId: 10086 }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.register({
      phone: "13800000000",
      verifyCode: "1234",
      captchaId: "cap-id-1",
      captchaValue: "A1b2"
    });

    expect(client.post).toHaveBeenCalledWith("/user/register", {
      phone: "13800000000",
      verifyCode: "1234",
      captchaId: "cap-id-1",
      captchaValue: "A1b2"
    });
    expect(result.registered).toBe(true);
    expect(result.userId).toBe(10086);
  });

  it("calls login endpoint with payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ token: "mock-jwt-token", loginType: "phone" }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.login({
      phone: "13800000000",
      smsCode: "123456"
    });

    expect(client.post).toHaveBeenCalledWith("/user/login", {
      phone: "13800000000",
      smsCode: "123456"
    });
    expect(result.token).toBe("mock-jwt-token");
  });

  it("calls send sms endpoint with payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ success: true, message: "验证码已发送" }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.sendSms({
      phone: "13800000000",
      captchaId: "cap-id-1",
      captchaValue: "A1b2"
    });

    expect(client.post).toHaveBeenCalledWith("/user/send-sms", {
      phone: "13800000000",
      captchaId: "cap-id-1",
      captchaValue: "A1b2"
    });
    expect(result.success).toBe(true);
  });

  it("calls captcha endpoint", async () => {
    const client = {
      post: vi.fn(),
      get: vi.fn().mockResolvedValue({ captchaId: "id-1", imageBase64: "base64-content" }),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.fetchCaptcha();

    expect(client.get).toHaveBeenCalledWith("/user/captcha");
    expect(result.captchaId).toBe("id-1");
  });

  it("calls profile update and role update endpoints", async () => {
    const client = {
      post: vi.fn(),
      get: vi.fn().mockResolvedValue({ userId: 10001, city: "Shanghai", role: "both" }),
      put: vi.fn().mockResolvedValue({ updated: true })
    };
    const api = createUserApi(client);

    await api.updateInfo({ city: "Hangzhou", district: "Xihu" });
    await api.updateRole({ role: "service" });

    expect(client.put).toHaveBeenNthCalledWith(1, "/user/info", {
      city: "Hangzhou",
      district: "Xihu"
    });
    expect(client.put).toHaveBeenNthCalledWith(2, "/user/role", { role: "service" });
  });
});
