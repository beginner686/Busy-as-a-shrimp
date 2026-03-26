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

export default function HomePage() {
  const fallbackBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

  return (
    <main className="page glass-card">
      <h1 className="title">AI资源共享平台（Web）</h1>
      <p className="subtitle">MVP Phase 1：用户 / 资源 / 匹配流程已进入页面骨架联调阶段。</p>
      <div className="grid">
        <section className="glass-card item">
          <h3 className="state-title">环境状态</h3>
          <p className="small">API 基址：{fallbackBaseUrl}</p>
          <p className="small">{getEnvSummary()}</p>
        </section>
        <section className="glass-card item">
          <h3 className="state-title">快速入口</h3>
          <div className="button-row">
            <Link href="/login" className="btn btn-secondary">
              去登录
            </Link>
            <Link href="/resource/new" className="btn btn-secondary">
              上传资源
            </Link>
            <Link href="/match/list" className="btn btn-secondary">
              查看匹配
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
