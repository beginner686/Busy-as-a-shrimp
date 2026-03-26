import { createHttpClient } from "@airp/http-client";
import { loadClientEnv } from "../env";

let cachedClient: ReturnType<typeof createHttpClient> | null = null;

export function getAdminClient(): ReturnType<typeof createHttpClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const env = loadClientEnv();
  cachedClient = createHttpClient({
    baseUrl: env.apiBaseUrl
  });
  return cachedClient;
}
