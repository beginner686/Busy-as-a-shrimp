import Link from "next/link";
import { loadClientEnv } from "../src/env";

function getEnvSummary(): string {
  try {
    const env = loadClientEnv();
    return `${env.appEnv} | ${env.apiBaseUrl}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return `配置未完成: ${message}`;
  }
}

export default function AdminHomePage() {
  const fallbackBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

  return (
    <main className="page glass">
      <h1 className="title">管理后台</h1>
      <p className="subtitle">Milestone 3：统计、用户、资源审核链路。</p>
      <p className="small">后端接口：{fallbackBaseUrl}/admin/*</p>
      <p className="small">Env 状态：{getEnvSummary()}</p>
      <div className="row" style={{ marginTop: 12 }}>
        <Link className="btn" href="/dashboard">
          去看板
        </Link>
        <Link className="btn btn-secondary" href="/resources/review">
          去审核
        </Link>
      </div>
    </main>
  );
}
