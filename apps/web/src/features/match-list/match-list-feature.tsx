"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles
} from "lucide-react";
import Link from "next/link";

import { getMatchApi } from "@/api";
import type { MatchItem } from "@/api/match-api";
import { MatchListSkeletonGrid } from "@/features/match-list/match-list-skeleton";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";

type MatchStatusFilter = "all" | "pending" | "confirmed" | "invalid";
type MatchStatus = "pending" | "confirmed" | "invalid";
type TargetStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export type MatchCardItem = {
  matchId: number;
  needId: number;
  resourceId: number;
  score: number;
  status: MatchStatus;
  targetStatus: TargetStatus;
  locationTags: string[];
  skillTags: string[];
  maskedContact: string;
};

export const MATCH_LIST_QUERY_KEY = ["match-list"] as const;

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeTextList(item));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (typeof value === "number") {
    return [String(value)];
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => normalizeTextList(item));
  }
  return [];
}

function maskContact(raw: unknown): string {
  if (typeof raw !== "string") {
    return "确认后可见";
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 11) {
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  }

  return "确认后可见";
}

function normalizeStatus(value: unknown): MatchStatus {
  if (value === "confirmed") {
    return "confirmed";
  }
  if (value === "rejected" || value === "invalid" || value === "expired") {
    return "invalid";
  }
  return "pending";
}

function normalizeTargetStatus(value: unknown, sourceStatus: unknown): TargetStatus {
  if (value === "CONFIRMED") {
    return "CONFIRMED";
  }
  if (value === "REJECTED") {
    return "REJECTED";
  }
  if (value === "PENDING") {
    return "PENDING";
  }

  // Mock fallback per spec.
  return sourceStatus === "CONFIRMED" ? "PENDING" : "PENDING";
}

function getYouHandshakeMeta(status: MatchStatus): { label: string; dotClassName: string } {
  if (status === "confirmed") {
    return {
      label: "[ YOU: READY ]",
      dotClassName: "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
    };
  }

  return {
    label: "[ YOU: PENDING ]",
    dotClassName: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]"
  };
}

function getTargetHandshakeMeta(status: TargetStatus): { label: string; dotClassName: string } {
  if (status === "CONFIRMED") {
    return {
      label: "[ TARGET: READY ]",
      dotClassName: "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
    };
  }

  if (status === "REJECTED") {
    return {
      label: "[ TARGET: REJECTED ]",
      dotClassName: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.7)]"
    };
  }

  return {
    label: "[ TARGET: AWAITING ]",
    dotClassName: "animate-pulse bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.75)]"
  };
}

function normalizeMatch(item: MatchItem & Record<string, unknown>, index: number): MatchCardItem {
  const matchId = Number(item.matchId);
  const needId = Number(item.needId);
  const resourceId = Number(item.resourceId);
  const score = Number(item.score);

  return {
    matchId: Number.isFinite(matchId) ? matchId : index + 1,
    needId: Number.isFinite(needId) ? needId : 0,
    resourceId: Number.isFinite(resourceId) ? resourceId : 0,
    score: Number.isFinite(score) ? score : 0,
    status: normalizeStatus(item.status),
    targetStatus: normalizeTargetStatus(item.targetStatus, item.status),
    locationTags: normalizeTextList(
      item.locationTags ?? item.regionTags ?? item.areaTags ?? item.location
    ).slice(0, 3),
    skillTags: normalizeTextList(item.skillTags ?? item.tags ?? item.skills).slice(0, 4),
    maskedContact: maskContact(item.contactMasked ?? item.phoneMasked ?? item.contact)
  };
}

export async function fetchMatchListQueryData(): Promise<MatchCardItem[]> {
  const list = await getMatchApi().list();
  return list
    .map((item, index) => normalizeMatch(item as MatchItem & Record<string, unknown>, index))
    .sort((a, b) => b.score - a.score);
}

function getStatusMeta(status: MatchStatus): { label: string; className: string } {
  if (status === "confirmed") {
    return {
      label: "已确认",
      className: "border-emerald-500/10 bg-emerald-500/5 text-emerald-400/90"
    };
  }
  if (status === "invalid") {
    return {
      label: "已失效",
      className: "border-white/5 bg-white/[0.02] text-zinc-500"
    };
  }
  return {
    label: "待确认",
    className: "border-amber-500/10 bg-amber-500/5 text-amber-400/90"
  };
}

function parseStatusFilter(value: string | null): MatchStatusFilter {
  if (value === "pending" || value === "confirmed" || value === "invalid") {
    return value;
  }
  return "all";
}

function LoginRequiredCard({ hydrated }: { hydrated: boolean }) {
  return (
    <Card className="rounded-3xl border-white/[0.05] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/[0.02]">
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight text-zinc-50">匹配列表</CardTitle>
        <CardDescription className="text-zinc-400/80">
          {hydrated ? "请先登录后查看匹配结果。" : "正在初始化页面..."}
        </CardDescription>
      </CardHeader>
      {hydrated ? (
        <CardFooter>
          <Button
            asChild
            className="rounded-xl bg-cyan-500 font-semibold tracking-wide text-black shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
          >
            <Link href="/auth">去登录</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function MatchListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<MatchCardItem | null>(null);
  const searchParamsSnapshot = searchParams.toString();
  const statusParam = searchParams.get("status");
  const queryParam = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(queryParam);

  const statusFilter = parseStatusFilter(statusParam);
  const keyword = queryParam.trim().toLowerCase();

  const {
    data = [],
    isFetching,
    isPending,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: MATCH_LIST_QUERY_KEY,
    queryFn: fetchMatchListQueryData,
    staleTime: 45_000,
    retry: 1
  });

  const filtered = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchable = [
        String(item.matchId),
        String(item.needId),
        String(item.resourceId),
        item.locationTags.join(" "),
        item.skillTags.join(" ")
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [data, keyword, statusFilter]);

  const syncUrlState = useCallback(
    (patch: { status?: MatchStatusFilter | null; q?: string | null }) => {
      const params = new URLSearchParams(searchParamsSnapshot);

      if (patch.status !== undefined) {
        if (!patch.status || patch.status === "all") {
          params.delete("status");
        } else {
          params.set("status", patch.status);
        }
      }

      if (patch.q !== undefined) {
        const q = patch.q?.trim();
        if (!q) {
          params.delete("q");
        } else {
          params.set("q", q);
        }
      }

      const next = params.toString();
      if (next === searchParamsSnapshot) {
        return;
      }

      router.replace(next ? `?${next}` : "?", { scroll: false });
    },
    [router, searchParamsSnapshot]
  );

  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncUrlState({ q: searchInput });
    }, 260);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, syncUrlState]);

  const confirmMutation = useMutation({
    mutationFn: async (matchId: number) => getMatchApi().confirm(matchId),
    onMutate: async (matchId) => {
      await queryClient.cancelQueries({ queryKey: MATCH_LIST_QUERY_KEY });
      const previous = queryClient.getQueryData<MatchCardItem[]>(MATCH_LIST_QUERY_KEY) ?? [];

      queryClient.setQueryData<MatchCardItem[]>(
        MATCH_LIST_QUERY_KEY,
        previous.map((item) =>
          item.matchId === matchId
            ? {
                ...item,
                status: "confirmed"
              }
            : item
        )
      );

      toast({
        title: "已确认匹配",
        description: "正在同步服务端状态..."
      });

      return { previous };
    },
    onError: (submitError, _matchId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MATCH_LIST_QUERY_KEY, context.previous);
      }

      toast({
        variant: "destructive",
        title: "确认失败，已回滚",
        description: getErrorMessage(submitError)
      });
    },
    onSuccess: () => {
      toast({
        title: "匹配确认成功",
        description: "已进入后续流程。"
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: MATCH_LIST_QUERY_KEY });
    }
  });

  const submittingId = confirmMutation.variables ?? null;

  return (
    <section className="space-y-4">
      <Card className="relative overflow-hidden border-white/[0.05] bg-white/[0.02] shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-white/[0.02] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-300 before:to-transparent before:opacity-20">
        <CardHeader className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tighter text-zinc-50">
                匹配列表
              </CardTitle>
              <CardDescription className="text-sm tracking-tight text-zinc-400/80">
                高契合度优先展示，确认后才开放联系方式。
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              刷新
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value.replace(/[^\w\u4e00-\u9fa5-\s]/g, ""))
                }
                placeholder="搜索匹配 ID / 标签"
                autoComplete="off"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "pending", "confirmed", "invalid"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={statusFilter === status ? "default" : "ghost"}
                  onClick={() => syncUrlState({ status })}
                  className={cn(
                    "rounded-lg px-3 transition-all",
                    statusFilter === status
                      ? "bg-white/10 text-white shadow-none hover:bg-white/20"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  )}
                >
                  {status === "all"
                    ? "全部"
                    : status === "pending"
                      ? "待确认"
                      : status === "confirmed"
                        ? "已确认"
                        : "已失效"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {isError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium">匹配列表加载失败</p>
              <p>{getErrorMessage(error)}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isError && isPending ? <MatchListSkeletonGrid count={4} /> : null}

      {!isError && !isPending && filtered.length === 0 ? (
        <Card className="border-white/[0.05] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-cyan-500/10 p-4 ring-1 ring-cyan-500/20">
              <Sparkles className="h-8 w-8 text-cyan-400/60" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-50">暂无匹配结果</h3>
              <p className="text-sm text-zinc-400/80">先发布资源，系统会自动尝试为你匹配。</p>
            </div>
            <Button
              asChild
              className="mt-2 rounded-xl bg-cyan-500 font-semibold tracking-wide text-black shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
            >
              <Link href="/resource/new">去发布资源</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isError && !isPending && filtered.length > 0 ? (
        <motion.ul className="grid gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {filtered.map((item) => {
              const statusMeta = getStatusMeta(item.status);
              const scoreWidth = Math.max(4, Math.min(100, item.score));
              const isPending = item.status === "pending";
              const isSubmitting = submittingId === item.matchId && confirmMutation.isPending;
              const youHandshakeMeta = getYouHandshakeMeta(item.status);
              const targetHandshakeMeta = getTargetHandshakeMeta(item.targetStatus);

              return (
                <motion.li
                  key={item.matchId}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <motion.div
                    whileHover={{ y: -2, scale: 1.003 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <Card className="relative overflow-hidden rounded-[2rem] border-white/[0.05] bg-white/[0.02] shadow-[0_16px_48px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/[0.02] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-300 before:to-transparent before:opacity-30">
                      <CardHeader className="space-y-4 p-6 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle className="text-lg font-extrabold tracking-tighter text-zinc-50">
                            匹配任务 <span className="text-cyan-400/90">#{item.matchId}</span>
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full border-none px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest",
                              statusMeta.className
                            )}
                          >
                            {statusMeta.label}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2 text-xs tracking-tight text-zinc-400/60">
                          <div className="h-1 w-1 rounded-full bg-zinc-600" />
                          需求 {item.needId} · 资源 {item.resourceId}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-6 p-6 pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                            <span>契合深度</span>
                            <span className="font-mono text-cyan-400">
                              {item.score.toFixed(1)} %
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-black/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
                            <motion.div
                              className="h-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${scoreWidth}%` }}
                              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                          <div className="rounded-xl border border-white/[0.03] bg-black/40 p-3 shadow-[inset_0_2px_10px_rgba(0,0,0,0.6)]">
                            <p className="mb-2 text-[10px] font-mono tracking-[0.2em] text-zinc-600">
                              HANDSHAKE MONITOR
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="flex items-center gap-2 rounded-lg border border-white/[0.03] bg-black/40 px-2.5 py-2">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    youHandshakeMeta.dotClassName
                                  )}
                                />
                                <span className="font-mono text-[10px] tracking-widest text-zinc-300">
                                  {youHandshakeMeta.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 rounded-lg border border-white/[0.03] bg-black/40 px-2.5 py-2">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    targetHandshakeMeta.dotClassName
                                  )}
                                />
                                <span className="font-mono text-[10px] tracking-widest text-zinc-300">
                                  {targetHandshakeMeta.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                              <MapPin className="h-3 w-3 text-cyan-500/50" />
                              地区标签
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.locationTags.length > 0 ? (
                                item.locationTags.map((tag) => (
                                  <Badge
                                    key={`${item.matchId}-location-${tag}`}
                                    variant="secondary"
                                    className="rounded-lg border border-white/[0.05] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
                                  >
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] text-zinc-600 italic">暂无记录</span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                              <CheckCircle2 className="h-3 w-3 text-cyan-500/50" />
                              核心技能
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.skillTags.length > 0 ? (
                                item.skillTags.map((tag) => (
                                  <Badge
                                    key={`${item.matchId}-skill-${tag}`}
                                    variant="secondary"
                                    className="rounded-lg border border-white/[0.05] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
                                  >
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] text-zinc-600 italic">暂无记录</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/[0.03] bg-black/40 p-4 shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)]">
                          <div className="flex items-start gap-4">
                            <div className="rounded-full bg-white/[0.03] p-2.5 ring-1 ring-white/[0.05]">
                              <Link2 className="h-4 w-4 text-zinc-500" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                                CONTACT ENCRYPTION
                              </p>
                              <p className="font-mono text-sm font-medium tracking-tight text-zinc-200">
                                {isPending ? "PROTECTED (CONFIRM TO VIEW)" : item.maskedContact}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="p-6 pt-0">
                        {isPending ? (
                          <Button
                            type="button"
                            onClick={() => setConfirmTarget(item)}
                            disabled={isSubmitting}
                            className="group w-full rounded-xl bg-cyan-500 font-bold tracking-widest text-black shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all hover:-translate-y-1 hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] sm:w-auto"
                          >
                            {isSubmitting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            确认并建立连接
                            <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </Button>
                        ) : null}
                      </CardFooter>
                    </Card>
                  </motion.div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      ) : null}

      <AlertDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => {
          if (!open && !confirmMutation.isPending) {
            setConfirmTarget(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-sm border-white/[0.05] bg-zinc-950/80 p-8 backdrop-blur-2xl ring-1 ring-white/[0.05]">
          <AlertDialogHeader className="space-y-4 text-center">
            <div className="mx-auto rounded-full bg-cyan-500/10 p-3 text-cyan-400 ring-1 ring-cyan-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-bold tracking-tight text-zinc-50">
                确认开启流程？
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-zinc-400/80">
                确认后将向对方展示您的联系方式并建立业务对接，是否继续？
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              disabled={confirmMutation.isPending || !confirmTarget}
              className="w-full rounded-xl bg-cyan-500 font-bold tracking-wide text-black shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:bg-cyan-400"
              onClick={(event) => {
                event.preventDefault();
                if (!confirmTarget) {
                  return;
                }
                void confirmMutation.mutateAsync(confirmTarget.matchId).finally(() => {
                  setConfirmTarget(null);
                });
              }}
            >
              {confirmMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              立即确认
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={confirmMutation.isPending}
              className="border-none bg-transparent font-medium text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            >
              返回修改
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function MatchListFeature() {
  const token = useUserStore((state) => state.token);
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt);
  const logout = useUserStore((state) => state.logout);

  const [hydrated, setHydrated] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      setIsAuthed(false);
      return;
    }

    if (!token) {
      setIsAuthed(false);
      return;
    }

    if (Date.now() >= tokenExpiresAt) {
      logout();
      setIsAuthed(false);
      return;
    }

    setIsAuthed(true);
  }, [hydrated, logout, token, tokenExpiresAt]);

  if (!isAuthed) {
    return <LoginRequiredCard hydrated={hydrated} />;
  }

  return <MatchListContent />;
}
