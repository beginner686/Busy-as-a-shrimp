import { beforeEach, describe, expect, it } from "vitest";
import { useUserStore } from "../user-store";

describe("useUserStore", () => {
  beforeEach(() => {
    useUserStore.setState({
      token: "",
      phone: "",
      role: "both",
      tokenExpiresAt: 0
    });
  });

  it("stores login payload and returns valid token", () => {
    useUserStore.getState().setLogin({
      token: "mock-token",
      phone: "13800000000",
      role: "service"
    });

    const state = useUserStore.getState();
    expect(state.token).toBe("mock-token");
    expect(state.phone).toBe("13800000000");
    expect(state.role).toBe("service");
    expect(state.getValidToken()).toBe("mock-token");
  });

  it("clears expired token when getValidToken is called", () => {
    useUserStore.setState({
      token: "expired",
      phone: "13800000000",
      role: "both",
      tokenExpiresAt: Date.now() - 1000
    });

    const token = useUserStore.getState().getValidToken();

    expect(token).toBe("");
    expect(useUserStore.getState().token).toBe("");
  });
});
