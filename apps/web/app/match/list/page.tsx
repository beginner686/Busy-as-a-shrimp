"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getMatchApi } from "@/api";
import type { MatchItem } from "@/api/match-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";

type MatchViewMode = "service" | "resource";
type MatchDecisionAction = "confirm" | "reject";

type MatchDecisionTarget = {
  action: MatchDecisionAction;
  item: MatchItem;
};

function getStatusMeta(status: MatchItem["status"]): {
  label: "待确认" | "已确认" | "已拒绝";
  variant: "secondary" | "default" | "destructive";
} {
  if (status === "confirmed") {
    return { label: "已确认", variant: "default" };
  }

  if (status === "rejected") {
    return { label: "已拒绝", variant: "destructive" };
  }

  return { label: "待确认", variant: "secondary" };
}

function getScoreLevel(score: number): "高" | "中" | "低" {
  if (score >= 85) {
    return "高";
  }
  if (score >= 70) {
    return "中";
  }
  return "低";
}

function getViewInsight(mode: MatchViewMode, item: MatchItem): { title: string; lines: string[] } {
  if (mode === "service") {
    return {
      title: "服务方视角",
      lines: [
        `需求ID：${item.needId}`,
        `候选资源ID：${item.resourceId}`,
        `履约优先级：${getScoreLevel(item.score)}（分值 ${item.score}）`
      ]
    };
  }

  return {
    title: "资源方视角",
    lines: [
      `资源ID：${item.resourceId}`,
      `可承接需求ID：${item.needId}`,
      `转化预估：${getScoreLevel(item.score)}（分值 ${item.score}）`
    ]
  };
}

export default function MatchListPage() {
  const searchParams = useSearchParams();
  const token = useUserStore((state) => state.getValidToken());
  const role = useUserStore((state) => state.role);

  const [needId, setNeedId] = useState("90001");
  const [items, setItems] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [skeletonCount, setSkeletonCount] = useState(3);
  const [fetchError, setFetchError] = useState("");
  const [runPending, setRunPending] = useState(false);
  const [pendingTask, setPendingTask] = useState<{ taskId: string; status: string } | null>(null);
  const [viewMode, setViewMode] = useState<MatchViewMode>("service");
  const [decisionTarget, setDecisionTarget] = useState<MatchDecisionTarget | null>(null);
  const [decisionPending, setDecisionPending] = useState<MatchDecisionTarget | null>(null);

  const hydratedFromQueryRef = useRef(false);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => b.score - a.score);
  }, [items]);

  useEffect(() => {
    if (role === "resource") {
      setViewMode("resource");
      return;
    }

    if (role === "service") {
      setViewMode("service");
    }
  }, [role]);

  async function loadList(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (!silent) {
      setSkeletonCount(Math.max(items.length, 3));
      setLoading(true);
    }

    setFetchError("");
    try {
      const list = await getMatchApi().list();
      setItems(list);
      setSkeletonCount(Math.max(list.length, 3));
    } catch (error) {
      setFetchError(getErrorMessage(error));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadList();
  }, [token]);

  useEffect(() => {
    if (!token || hydratedFromQueryRef.current) {
      return;
    }

    const queryNeedId = searchParams.get("needId");
    const queryTaskId = searchParams.get("taskId");
    const queryTaskStatus = searchParams.get("taskStatus") ?? "pending";

    if (queryNeedId && /^\d+$/.test(queryNeedId)) {
      setNeedId(queryNeedId);
    }

    if (queryTaskId) {
      setPendingTask({ taskId: queryTaskId, status: queryTaskStatus });
      toast({
        title: "已接收匹配任务",
        description: `任务 ${queryTaskId} 当前状态：${queryTaskStatus}`
      });
    }

    hydratedFromQueryRef.current = true;
  }, [searchParams, token]);

  useEffect(() => {
    if (!pendingTask) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingTask(null);
    }, 4200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pendingTask]);

  async function runMatch() {
    const trimmedNeedId = needId.trim();
    if (!/^\d+$/.test(trimmedNeedId)) {
      toast({
        variant: "destructive",
        title: "需求 ID 无效",
        description: "请输入纯数字的需求 ID。"
      });
      return;
    }

    setRunPending(true);
    setFetchError("");
    try {
      const result = await getMatchApi().run({ needId: Number(trimmedNeedId) });
      setPendingTask(result);
      toast({
        title: "匹配任务已触发",
        description: `任务 ${result.taskId} 当前状态：${result.status}`
      });
      await loadList({ silent: true });
    } catch (error) {
      const message = getErrorMessage(error);
      setFetchError(message);
      toast({
        variant: "destructive",
        title: "发起匹配失败",
        description: message
      });
    } finally {
      setRunPending(false);
    }
  }

  async function executeDecision() {
    if (!decisionTarget) {
      return;
    }

    setDecisionPending(decisionTarget);
    try {
      const response =
        decisionTarget.action === "confirm"
          ? await getMatchApi().confirm(decisionTarget.item.matchId)
          : await getMatchApi().reject(decisionTarget.item.matchId);

      toast({
        title: decisionTarget.action === "confirm" ? "匹配已确认" : "匹配已拒绝",
        description: `匹配 #${response.matchId} 状态更新为 ${response.status}`
      });

      await loadList({ silent: true });
      setDecisionTarget(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: decisionTarget.action === "confirm" ? "确认匹配失败" : "拒绝匹配失败",
        description: getErrorMessage(error)
      });
    } finally {
      setDecisionPending(null);
    }
  }

  if (!token) {
    return (
      <Card className="rounded-3xl border-white/70 bg-white/70 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl">匹配列表</CardTitle>
          <CardDescription>请先登录后再执行匹配流程。</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link href="/auth">去登录</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl">匹配列表</CardTitle>
          <CardDescription>触发匹配任务并确认候选资源。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">需求 ID</p>
              <Input
                value={needId}
                onChange={(event) => setNeedId(event.target.value)}
                placeholder="输入需求 ID"
              />
            </div>

            <Button type="button" onClick={() => void runMatch()} disabled={runPending}>
              {runPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {runPending ? "调度中..." : "触发匹配"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => void loadList()}
              disabled={loading || runPending}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              刷新列表
            </Button>
          </div>

          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as MatchViewMode)}>
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="service">服务方视角</TabsTrigger>
              <TabsTrigger value="resource">资源方视角</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <AnimatePresence>
        {(runPending || pendingTask) && (
          <motion.div
            key="pending-match-task"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <Card className="border-sky-300/60 bg-sky-50/70 shadow-sm backdrop-blur">
              <CardContent className="flex items-center gap-3 p-4">
                <motion.div
                  className="h-8 w-8 rounded-full border-2 border-sky-300 border-t-sky-600"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <div>
                  <p className="text-sm font-semibold text-sky-900">匹配任务调度中</p>
                  <p className="text-xs text-sky-700">
                    {runPending
                      ? "正在请求调度服务，请稍候..."
                      : `任务 ${pendingTask?.taskId ?? "-"} 已进入 ${pendingTask?.status ?? "pending"} 状态`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="border-border/70 bg-white/70">
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-16 w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && fetchError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium">匹配列表加载失败</p>
              <p>{fetchError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadList()}>
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !fetchError && sortedItems.length === 0 ? (
        <Card className="border-border/70 bg-white/70">
          <CardContent className="p-6 text-sm text-muted-foreground">
            暂无匹配结果，先触发一次匹配任务。
          </CardContent>
        </Card>
      ) : null}

      {!loading && !fetchError && sortedItems.length > 0 ? (
        <div className="grid gap-3">
          {sortedItems.map((item) => {
            const statusMeta = getStatusMeta(item.status);
            const insight = getViewInsight(viewMode, item);
            const isTerminal = item.status === "confirmed" || item.status === "rejected";
            const isConfirmPending =
              decisionPending?.item.matchId === item.matchId &&
              decisionPending.action === "confirm";
            const isRejectPending =
              decisionPending?.item.matchId === item.matchId && decisionPending.action === "reject";

            return (
              <motion.div
                key={item.matchId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">匹配 #{item.matchId}</CardTitle>
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </div>
                    <CardDescription>
                      需求 {item.needId} 对应资源 {item.resourceId}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="rounded-lg border border-border/70 bg-slate-50/80 p-3">
                      <p className="text-xs font-medium text-slate-700">{insight.title}</p>
                      <div className="mt-2 space-y-1 text-sm text-slate-700">
                        {insight.lines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setDecisionTarget({ action: "confirm", item })}
                      disabled={isTerminal || isConfirmPending || isRejectPending}
                    >
                      {isConfirmPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      确认匹配
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setDecisionTarget({ action: "reject", item })}
                      disabled={isTerminal || isConfirmPending || isRejectPending}
                    >
                      {isRejectPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      拒绝匹配
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(decisionTarget)}
        onOpenChange={(open) => {
          if (!open && !decisionPending) {
            setDecisionTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decisionTarget?.action === "confirm" ? "确认该匹配结果？" : "确认拒绝该匹配？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decisionTarget
                ? `匹配 #${decisionTarget.item.matchId}（需求 ${decisionTarget.item.needId} / 资源 ${decisionTarget.item.resourceId}）将被${decisionTarget.action === "confirm" ? "确认为有效匹配" : "标记为已拒绝"}。`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(decisionPending)}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void executeDecision();
              }}
              className={
                decisionTarget?.action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""
              }
              disabled={Boolean(decisionPending)}
            >
              {decisionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {decisionTarget?.action === "confirm" ? "确认匹配" : "确认拒绝"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
