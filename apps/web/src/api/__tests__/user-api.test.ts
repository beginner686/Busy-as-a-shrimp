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

    const result = await api.register({ phone: "13800000000", verifyCode: "1234" });

    expect(client.post).toHaveBeenCalledWith("/user/register", {
      body: { phone: "13800000000", verifyCode: "1234" }
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

    const result = await api.login({ phone: "13800000000", verifyCode: "1234" });

    expect(client.post).toHaveBeenCalledWith("/user/login", {
      body: { phone: "13800000000", verifyCode: "1234" }
    });
    expect(result.token).toBe("mock-jwt-token");
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
      body: { city: "Hangzhou", district: "Xihu" }
    });
    expect(client.put).toHaveBeenNthCalledWith(2, "/user/role", {
      body: { role: "service" }
    });
  });
});
