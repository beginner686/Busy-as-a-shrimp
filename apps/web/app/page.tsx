"use client";

import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { getMatchApi } from "@/api";
import type { MatchItem } from "@/api/match-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
    <section className="grid gap-4">
      <Card className="border-white/70 bg-white/75 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-3xl text-slate-900">虾忙</CardTitle>
          <CardDescription>仪表盘：用户状态、快速入口与匹配任务调度。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-slate-50/80 p-3">
            <p className="text-xs text-muted-foreground">当前登录状态</p>
            <p className="mt-1 text-sm font-medium">{loginStatusLabel}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-slate-50/80 p-3">
            <p className="text-xs text-muted-foreground">API Base URL</p>
            <p className="mt-1 truncate text-sm font-medium">{env.apiBaseUrl}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-slate-50/80 p-3">
            <p className="text-xs text-muted-foreground">待处理匹配 (pending)</p>
            {loadingPendingCount ? (
              <Skeleton className="mt-2 h-5 w-12" />
            ) : (
              <p className="mt-1 text-lg font-semibold text-slate-900">{pendingCount}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/70 bg-white/75 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">快速入口</CardTitle>
            <CardDescription>常用业务入口与实时匹配积压。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="secondary" className="w-full justify-start">
              <Link href="/auth">登录/注册</Link>
            </Button>
            <Button asChild className="w-full justify-start">
              <Link href="/resource/new">新建资源</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link
                href="/match/list"
                onMouseEnter={prefetchMatchListOnIntent}
                onFocus={prefetchMatchListOnIntent}
              >
                <span>查看匹配</span>
                <Badge variant={pendingCount > 0 ? "secondary" : "outline"}>
                  pending {loadingPendingCount ? "..." : pendingCount}
                </Badge>
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/75 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">匹配任务调度</CardTitle>
            <CardDescription>填写需求 ID，一键触发排产。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">需求 ID</p>
              <Input
                value={needId}
                onChange={(event) => setNeedId(event.target.value)}
                placeholder="输入需求 ID"
              />
            </div>

            <Button
              type="button"
              onClick={() => void onRunMatch()}
              disabled={runningMatch}
              className="w-full"
            >
              {runningMatch ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {runningMatch ? "排产中..." : "一键匹配"}
            </Button>
          </CardContent>
          {dispatchResult ? (
            <CardFooter>
              <div
                className={`flex w-full items-start gap-2 rounded-md border p-3 text-sm ${
                  dispatchResult.kind === "success"
                    ? "border-emerald-300/70 bg-emerald-50/80 text-emerald-800"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                {dispatchResult.kind === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <p>{dispatchResult.text}</p>
              </div>
            </CardFooter>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
