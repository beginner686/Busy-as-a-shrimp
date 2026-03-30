import { beforeEach, describe, expect, it } from "vitest";
import { loadClientEnv } from "../env";

describe("web loadClientEnv", () => {
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  });

  it("uses fallback when NEXT_PUBLIC_API_BASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    expect(loadClientEnv()).toEqual({
      apiBaseUrl: "http://localhost:8081/api/v1"
    });
  });

  it("returns parsed env values", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8081/api/v1";

    expect(loadClientEnv()).toEqual({
      apiBaseUrl: "http://localhost:8081/api/v1"
    });
  });
});
