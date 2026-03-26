import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true
  },
  webServer: {
    command: "corepack pnpm --filter @airp/web dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:3001/api/v1",
      NEXT_PUBLIC_APP_ENV: "local",
      NEXT_PUBLIC_ENABLE_MSW: "1"
    }
  }
});
