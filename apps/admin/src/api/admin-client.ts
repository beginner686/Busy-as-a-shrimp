import { createHttpClient } from "@airp/http-client";
import { loadClientEnv } from "../env";
import { getAdminToken } from "../../lib/auth";

export function getAdminClient(): ReturnType<typeof createHttpClient> {
  const env = loadClientEnv();
  const token = getAdminToken();

  return createHttpClient({
    baseUrl: env.apiBaseUrl,
    fetcher: (url, init) => {
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(url, { ...init, headers });
    }
  });
}
