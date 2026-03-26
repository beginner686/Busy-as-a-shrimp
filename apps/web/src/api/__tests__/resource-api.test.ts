import { describe, expect, it, vi } from "vitest";
import { createResourceApi } from "../resource-api";

describe("createResourceApi", () => {
  it("calls upload endpoint with normalized payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ resourceId: 20001, reviewStatus: "pending" }),
      get: vi.fn()
    };
    const api = createResourceApi(client);

    await api.upload({
      resourceType: "skill",
      tags: ["短视频", "探店"],
      areaCode: "310000"
    });

    expect(client.post).toHaveBeenCalledWith("/resource/upload", {
      resourceType: "skill",
      tags: ["短视频", "探店"],
      areaCode: "310000"
    });
  });

  it("loads resources and tags", async () => {
    const client = {
      post: vi.fn(),
      get: vi
        .fn()
        .mockResolvedValueOnce([{ resourceId: 20001, tags: ["短视频"], status: "active" }])
        .mockResolvedValueOnce(["地区", "技能"])
    };
    const api = createResourceApi(client);

    const list = await api.list();
    const tags = await api.tags();

    expect(list).toHaveLength(1);
    expect(tags).toEqual(["地区", "技能"]);
  });
});
