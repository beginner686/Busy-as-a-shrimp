import { describe, expect, it, vi } from "vitest";
import { createAdminApi } from "../admin-api";

describe("createAdminApi", () => {
  it("loads dashboard stats", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        totalUsers: 100,
        activeUsers: 90,
        totalResources: 20,
        pendingResources: 3,
        activeCaptains: 12,
        matchRate: 50,
        announcementCount: 2
      }),
      put: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
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
        .mockResolvedValueOnce([{ resourceId: 20001, status: "pending", tags: [] }]),
      put: vi.fn().mockResolvedValue({ resourceId: 20001, status: "active" }),
      post: vi.fn(),
      delete: vi.fn()
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

  it("loads dict types and cascades dict data query", async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce([
          { dictId: 1, dictName: "任务状态", dictType: "task_status", status: "normal" }
        ])
        .mockResolvedValueOnce([
          {
            dictDataId: 10,
            dictCode: "PENDING",
            dictLabel: "待处理",
            dictValue: "pending",
            dictSort: 1,
            status: "normal"
          }
        ]),
      put: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };
    const api = createAdminApi(client);

    const types = await api.dictTypes();
    const data = await api.dictData("task_status");

    expect(types).toHaveLength(1);
    expect(data).toHaveLength(1);
    expect(client.get).toHaveBeenNthCalledWith(1, "/admin/dict/types");
    expect(client.get).toHaveBeenNthCalledWith(2, "/admin/dict/data?dictType=task_status");
  });

  it("creates, updates and deletes dict data", async () => {
    const client = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue({
        dictDataId: 11,
        dictCode: "ARCHIVED",
        dictLabel: "归档",
        dictValue: "archived",
        dictSort: 5,
        status: "disabled"
      }),
      post: vi.fn().mockResolvedValue({
        dictDataId: 11,
        dictCode: "ARCHIVED",
        dictLabel: "已归档",
        dictValue: "archived",
        dictSort: 4,
        status: "normal"
      }),
      delete: vi.fn().mockResolvedValue({ dictDataId: 11 })
    };
    const api = createAdminApi(client);

    await api.createDictData({
      dictType: "task_status",
      dictCode: "ARCHIVED",
      dictLabel: "已归档",
      dictValue: "archived",
      dictSort: 4,
      status: "normal"
    });
    await api.updateDictData(11, {
      dictCode: "ARCHIVED",
      dictLabel: "归档",
      dictValue: "archived",
      dictSort: 5,
      status: "disabled"
    });
    await api.deleteDictData(11);

    expect(client.post).toHaveBeenCalledWith("/admin/dict/data", {
      body: {
        dictType: "task_status",
        dictCode: "ARCHIVED",
        dictLabel: "已归档",
        dictValue: "archived",
        dictSort: 4,
        status: "normal"
      }
    });
    expect(client.put).toHaveBeenCalledWith("/admin/dict/data/11", {
      body: {
        dictCode: "ARCHIVED",
        dictLabel: "归档",
        dictValue: "archived",
        dictSort: 5,
        status: "disabled"
      }
    });
    expect(client.delete).toHaveBeenCalledWith("/admin/dict/data/11");
  });

  it("creates, updates and deletes dict type", async () => {
    const client = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue({
        dictId: 4,
        dictName: "任务状态",
        dictType: "task_status",
        status: "normal"
      }),
      post: vi.fn().mockResolvedValue({
        dictId: 4,
        dictName: "任务状态",
        dictType: "task_status",
        status: "normal"
      }),
      delete: vi.fn().mockResolvedValue({ dictId: 4 })
    };
    const api = createAdminApi(client);

    await api.createDictType({
      dictName: "任务状态",
      dictType: "task_status",
      status: "normal"
    });
    await api.updateDictType(4, {
      dictName: "任务状态",
      dictType: "task_status",
      status: "disabled"
    });
    await api.deleteDictType(4);

    expect(client.post).toHaveBeenCalledWith("/admin/dict/types", {
      body: {
        dictName: "任务状态",
        dictType: "task_status",
        status: "normal"
      }
    });
    expect(client.put).toHaveBeenCalledWith("/admin/dict/types/4", {
      body: {
        dictName: "任务状态",
        dictType: "task_status",
        status: "disabled"
      }
    });
    expect(client.delete).toHaveBeenCalledWith("/admin/dict/types/4");
  });
});
