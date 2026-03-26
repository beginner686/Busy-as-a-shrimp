"use client";

import Link from "next/link";
import { useState } from "react";
import { getMatchApi } from "../src/api";
import { loadClientEnv } from "../src/config/env";
import { getErrorMessage } from "../src/utils/error-message";

export default function HomePage() {
  const [runningMatch, setRunningMatch] = useState(false);
  const [matchStatus, setMatchStatus] = useState("");
  const [message, setMessage] = useState("");
  const env = loadClientEnv();

  async function onRunMatch() {
    setRunningMatch(true);
    setMessage("");
    setMatchStatus("pending");
    try {
      const result = await getMatchApi().run({ needId: 90001 });
      setMatchStatus(result.status || "queued");
      setMessage(`匹配任务已创建：${result.taskId}`);
    } catch (error) {
      setMatchStatus("");
      setMessage(getErrorMessage(error));
    } finally {
      setRunningMatch(false);
    }
  }

  return (
    <section className="grid gap-4">
      <article className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-slate-900">AI资源共享平台（Web）</h1>
        <p className="mt-2 text-sm text-slate-600">Phase 1: 用户认证、资源上传、匹配流程。</p>
        <div className="mt-4 rounded-2xl bg-slate-100/80 p-4">
          <p className="text-sm text-slate-700">API Base URL: {env.apiBaseUrl}</p>
        </div>
      </article>

      <article className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-slate-900">工作台 / 快速入口</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            登录/注册
          </Link>
          <Link
            href="/resource/new"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            新建资源
          </Link>
          <button
            type="button"
            onClick={() => void onRunMatch()}
            disabled={runningMatch}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningMatch ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                匹配中
              </>
            ) : (
              "查看匹配"
            )}
          </button>
        </div>

        {matchStatus ? (
          <p className="mt-4 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
            任务状态: {matchStatus}
          </p>
        ) : null}
        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </article>
    </section>
  );
}
