import { describe, expect, it, vi } from "vitest";
import { createMatchApi } from "../match-api";

describe("createMatchApi", () => {
  it("calls list endpoint", async () => {
    const client = {
      get: vi.fn().mockResolvedValue([{ matchId: 30001, score: 92.5 }]),
      post: vi.fn()
    };
    const api = createMatchApi(client);

    const list = await api.list();

    expect(client.get).toHaveBeenCalledWith("/match/list");
    expect(list[0]?.matchId).toBe(30001);
  });

  it("calls run and confirm endpoints", async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ status: "queued" })
    };
    const api = createMatchApi(client);

    await api.run({ needId: 90001 });
    await api.confirm(30001);

    expect(client.post).toHaveBeenNthCalledWith(1, "/match/run", { needId: 90001 });
    expect(client.post).toHaveBeenNthCalledWith(2, "/match/30001/confirm");
  });
});
