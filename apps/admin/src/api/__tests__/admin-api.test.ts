import { describe, expect, it, vi } from "vitest";
import { createAdminApi } from "../admin-api";

describe("createAdminApi", () => {
  it("loads dashboard stats", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ totalUsers: 100, totalResources: 20, matchRate: 0.5 }),
      put: vi.fn()
    };
    const api = createAdminApi(client);

    const stats = await api.stats();

    expect(client.get).toHaveBeenCalledWith("/admin/stats");
    expect(stats.totalUsers).toBe(100);
  });

  it("loads users/resources and sends review action", async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce([{ userId: 10001 }])
        .mockResolvedValueOnce([{ resourceId: 20001 }]),
      put: vi.fn().mockResolvedValue({ resourceId: 20001, status: "active" })
    };
    const api = createAdminApi(client);

    await api.users();
    await api.resources();
    await api.reviewResource(20001, "approve");

    expect(client.get).toHaveBeenNthCalledWith(1, "/admin/users");
    expect(client.get).toHaveBeenNthCalledWith(2, "/admin/resources");
    expect(client.put).toHaveBeenCalledWith("/admin/resources/20001", {
      body: { decision: "approve" }
    });
  });
});
