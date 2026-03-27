"use client";

import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  Cpu,
  Loader2,
  LogIn,
  Rocket,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { getMatchApi } from "@/api";
import type { MatchItem } from "@/api/match-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MATCH_LIST_QUERY_KEY,
  fetchMatchListQueryData
} from "@/features/match-list/match-list-feature";
import { toast } from "@/hooks/use-toast";
import { useAuthStatus } from "@/stores/use-auth-status";
import { loadClientEnv } from "@/config/env";
import { getErrorMessage } from "@/utils/error-message";

type DispatchResult = {
  kind: "success" | "error";
  text: string;
};

function isPendingMatch(status: MatchItem["status"]): boolean {
  return status === "queued" || status === "pushed";
}

const obsidianCardClass =
  "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-300 before:to-transparent before:opacity-30 transition-all duration-300 ease-out hover:-translate-y-2 hover:border-white/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),_inset_0_0_15px_rgba(6,182,212,0.08)]";

export default function HomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hydrated, isLoggedIn, phone } = useAuthStatus();
  const [runningMatch, setRunningMatch] = useState(false);
  const [needId, setNeedId] = useState("90001");
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingPendingCount, setLoadingPendingCount] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(null);
  const env = loadClientEnv();

  const loginStatusLabel = useMemo(() => {
    if (!hydrated) {
      return "加载中";
    }
    if (!isLoggedIn) {
      return "未登录";
    }
    return phone ? `已登录 (${phone})` : "已登录";
  }, [hydrated, isLoggedIn, phone]);

  async function loadPendingCount() {
    if (!isLoggedIn) {
      setPendingCount(0);
      return;
    }

    setLoadingPendingCount(true);
    try {
      const list = await getMatchApi().list();
      setPendingCount(list.filter((item) => isPendingMatch(item.status)).length);
    } catch {
      setPendingCount(0);
    } finally {
      setLoadingPendingCount(false);
    }
  }

  useEffect(() => {
    void loadPendingCount();
  }, [isLoggedIn]);

  function prefetchMatchListOnIntent() {
    if (!isLoggedIn) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: MATCH_LIST_QUERY_KEY,
      queryFn: fetchMatchListQueryData,
      staleTime: 45_000
    });
  }

  async function onRunMatch() {
    const trimmedNeedId = needId.trim();
    if (!/^\d+$/.test(trimmedNeedId)) {
      toast({
        variant: "destructive",
        title: "需求 ID 无效",
        description: "请输入纯数字的需求 ID。"
      });
      return;
    }

    if (!isLoggedIn) {
      router.push(`/auth?redirect=${encodeURIComponent(`/match/list?needId=${trimmedNeedId}`)}`);
      return;
    }

    setRunningMatch(true);
    setDispatchResult(null);
    try {
      const result = await getMatchApi().run({ needId: Number(trimmedNeedId) });
      const successText = `排产成功：任务 ${result.taskId}，当前状态 ${result.status}。`;
      setDispatchResult({
        kind: "success",
        text: successText
      });
      toast({
        title: "匹配任务已触发",
        description: `任务 ${result.taskId} 当前状态：${result.status}`
      });
      await loadPendingCount();
      router.push(
        `/match/list?needId=${encodeURIComponent(trimmedNeedId)}&taskId=${encodeURIComponent(result.taskId)}&taskStatus=${encodeURIComponent(result.status || "pending")}`
      );
    } catch (error) {
      const errorText = `排产失败：${getErrorMessage(error)}`;
      setDispatchResult({
        kind: "error",
        text: errorText
      });
      toast({
        variant: "destructive",
        title: "触发匹配失败",
        description: getErrorMessage(error)
      });
    } finally {
      setRunningMatch(false);
    }
  }

  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_center,_#111827_0%,_#030712_100%)] p-6 text-zinc-50">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.05]" />
        <div className="absolute left-1/2 top-[-18%] h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[150px]" />
        <div className="absolute -right-24 bottom-[-20%] h-[320px] w-[420px] rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.6fr_1fr]">
          <article className={`${obsidianCardClass} p-6`}>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <p className="text-[10px] font-mono tracking-wider text-zinc-500">
                  [ SYSTEM READY ]
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
                  AI 资源调度中心
                </h1>
                <p className="text-sm text-zinc-400">状态校验、任务排产与匹配预取已就绪。</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                <CircleDot className="h-3.5 w-3.5 animate-pulse" />
                ONLINE
              </span>
            </div>
          </article>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <article className={`${obsidianCardClass} p-5`}>
              <p className="text-xs text-zinc-500">当前登录状态</p>
              <p className="mt-2 text-sm text-zinc-300">{loginStatusLabel}</p>
            </article>

            <article className={`${obsidianCardClass} p-5`}>
              <p className="text-xs text-zinc-500">Pending 匹配</p>
              {loadingPendingCount ? (
                <Skeleton className="mt-3 h-7 w-14 rounded-md bg-zinc-800" />
              ) : (
                <p className="mt-2 font-mono text-2xl tracking-tight text-cyan-300">
                  {pendingCount}
                </p>
              )}
            </article>
          </div>
        </div>

        {!isLoggedIn && hydrated ? (
          <article className={`${obsidianCardClass} mx-auto max-w-2xl p-8 text-center`}>
            <p className="text-lg font-semibold tracking-tight text-zinc-100">
              请先登录以执行匹配调度
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              未登录状态下可访问基础入口，调度操作将跳转到认证页。
            </p>
            <Button
              asChild
              className="mt-5 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 px-6 text-white shadow-sm ring-1 ring-inset ring-white/10 transition-all duration-200 hover:-translate-y-[1px]"
            >
              <Link href="/auth">
                <LogIn className="h-4 w-4" />
                去登录
              </Link>
            </Button>
          </article>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
          <article
            className={`${obsidianCardClass} bg-gradient-to-br from-zinc-900/90 to-black/90 p-6 md:col-span-2`}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono tracking-wider text-zinc-500">
                  [ AI MATCH ENGINE ]
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-50">一键匹配</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  输入需求 ID，触发排产并自动跳转匹配结果页。
                </p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-300">
                <Cpu className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  need_id
                </span>
                <Input
                  value={needId}
                  onChange={(event) => setNeedId(event.target.value)}
                  placeholder="输入需求 ID"
                  className="h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-4 text-zinc-100 placeholder:text-zinc-500 transition-all duration-200 hover:border-zinc-600 focus-visible:border-cyan-500/40 focus-visible:ring-4 focus-visible:ring-cyan-500/10"
                />
              </label>
              <Button
                type="button"
                onClick={() => void onRunMatch()}
                disabled={runningMatch}
                className="h-11 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 px-6 text-white shadow-sm ring-1 ring-inset ring-white/10 transition-all duration-200 hover:-translate-y-[1px]"
              >
                {runningMatch ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {runningMatch ? "排产中..." : "执行匹配"}
              </Button>
            </div>

            {dispatchResult ? (
              <div
                className={`mt-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${
                  dispatchResult.kind === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {dispatchResult.kind === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <p>{dispatchResult.text}</p>
              </div>
            ) : null}
          </article>

          <article className={`${obsidianCardClass} p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-zinc-100">匹配列表</h2>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-300">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <p className="mb-4 text-xs text-zinc-500">悬停触发预取，打开即命中缓存。</p>
            <Button
              asChild
              variant="secondary"
              className="h-10 w-full rounded-full border border-white/10 bg-zinc-900/70 text-zinc-100 transition-all duration-200 hover:-translate-y-[1px] hover:border-cyan-500/30 hover:bg-zinc-800"
            >
              <Link
                href="/match/list"
                onMouseEnter={prefetchMatchListOnIntent}
                onFocus={prefetchMatchListOnIntent}
              >
                查看匹配
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </article>

          <article className={`${obsidianCardClass} p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-zinc-100">资源入口</h2>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-300">
                <Rocket className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-3">
              <Button
                asChild
                variant="secondary"
                className="h-10 w-full rounded-full border border-white/10 bg-zinc-900/70 text-zinc-100 transition-all duration-200 hover:-translate-y-[1px] hover:border-cyan-500/30 hover:bg-zinc-800"
              >
                <Link href="/resource/new">
                  发布资源
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                className="h-10 w-full rounded-full border border-white/10 bg-zinc-900/70 text-zinc-100 transition-all duration-200 hover:-translate-y-[1px] hover:border-cyan-500/30 hover:bg-zinc-800"
              >
                <Link href="/auth">
                  登录 / 注册
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </article>

          <article className={`${obsidianCardClass} p-6 md:col-span-2`}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono tracking-wider text-zinc-500">[ RUNTIME ]</p>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-zinc-100">系统面板</h2>
              </div>
              <span className="font-mono text-sm tracking-tight text-cyan-300">
                pending={loadingPendingCount ? "..." : pendingCount}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-zinc-900/70 p-4">
                <p className="text-xs text-zinc-500">api_base_url</p>
                <p className="mt-1 truncate font-mono text-xs tracking-tight text-cyan-300">
                  {env.apiBaseUrl}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-900/70 p-4">
                <p className="text-xs text-zinc-500">auth_state</p>
                <p className="mt-1 text-sm text-zinc-300">{loginStatusLabel}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
