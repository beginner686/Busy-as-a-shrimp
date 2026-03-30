import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:8081/api/v1")
});

export interface ClientEnv {
  apiBaseUrl: string;
}

let cachedEnv: ClientEnv | null = null;

export function loadClientEnv(envSource: NodeJS.ProcessEnv = process.env): ClientEnv {
  if (envSource === process.env && cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(envSource);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid client env: ${detail}`);
  }

  const env: ClientEnv = {
    apiBaseUrl: parsed.data.NEXT_PUBLIC_API_BASE_URL
  };

  if (envSource === process.env) {
    cachedEnv = env;
  }

  return env;
}
