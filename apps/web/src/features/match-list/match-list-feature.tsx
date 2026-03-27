"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
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

export type MatchCardItem = {
  matchId: number;
  needId: number;
  resourceId: number;
  score: number;
  status: MatchStatus;
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
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
    };
  }
  if (status === "invalid") {
    return {
      label: "已失效",
      className: "border-white/5 bg-zinc-800 text-zinc-400"
    };
  }
  return {
    label: "待确认",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-400"
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
    <Card className="rounded-3xl border-white/10 bg-zinc-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-zinc-50">匹配列表</CardTitle>
        <CardDescription className="text-zinc-400">
          {hydrated ? "请先登录后查看匹配结果。" : "正在初始化页面..."}
        </CardDescription>
      </CardHeader>
      {hydrated ? (
        <CardFooter>
          <Button
            asChild
            className="bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
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
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");

  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const keyword = (searchParams.get("q") ?? "").trim().toLowerCase();

  const { data, isFetching, error, refetch } = useSuspenseQuery({
    queryKey: MATCH_LIST_QUERY_KEY,
    queryFn: fetchMatchListQueryData,
    staleTime: 45_000
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
      const params = new URLSearchParams(searchParams.toString());

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
      const current = searchParams.toString();
      if (next === current) {
        return;
      }

      router.replace(next ? `?${next}` : "?", { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "");
  }, [searchParams]);

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
      <Card className="border-white/10 bg-zinc-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl text-zinc-50">匹配列表</CardTitle>
              <CardDescription className="text-zinc-400">
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
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "confirmed", "invalid"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => syncUrlState({ status })}
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

      {error ? (
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

      {!error && filtered.length === 0 ? (
        <Card className="border-white/10 bg-zinc-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="h-8 w-8 text-cyan-500/50" />
            <h3 className="text-base font-semibold text-zinc-50">暂无匹配结果</h3>
            <p className="text-sm text-zinc-400">先发布资源，系统会自动尝试为你匹配。</p>
            <Button
              asChild
              className="bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
            >
              <Link href="/resource/new">去发布资源</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!error && filtered.length > 0 ? (
        <motion.ul className="grid gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {filtered.map((item) => {
              const statusMeta = getStatusMeta(item.status);
              const scoreWidth = Math.max(4, Math.min(100, item.score));
              const isPending = item.status === "pending";
              const isSubmitting = submittingId === item.matchId && confirmMutation.isPending;

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
                    <Card className="border-white/10 bg-zinc-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                      <CardHeader className="space-y-2 pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="text-base text-zinc-50">
                            匹配任务 #{item.matchId}
                          </CardTitle>
                          <Badge variant="outline" className={statusMeta.className}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                        <CardDescription className="text-zinc-400">
                          需求 {item.needId} 对应资源 {item.resourceId}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-zinc-400">契合度</span>
                            <span className="font-semibold text-zinc-50">
                              {item.score.toFixed(1)} 分
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-zinc-800">
                            <motion.div
                              className="h-2 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${scoreWidth}%` }}
                              transition={{ duration: 0.35, ease: "easeOut" }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                            <MapPin className="h-3.5 w-3.5" />
                            地区标签
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.locationTags.length > 0 ? (
                              item.locationTags.map((tag) => (
                                <Badge
                                  key={`${item.matchId}-location-${tag}`}
                                  variant="secondary"
                                  className="border border-white/5 bg-zinc-800 text-zinc-300"
                                >
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-500">暂无地区标签</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            技能标签
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.skillTags.length > 0 ? (
                              item.skillTags.map((tag) => (
                                <Badge
                                  key={`${item.matchId}-skill-${tag}`}
                                  variant="secondary"
                                  className="border border-white/5 bg-zinc-800 text-zinc-300"
                                >
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-500">暂无技能标签</span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-zinc-800/60 p-3 text-xs text-zinc-400">
                          <div className="flex items-start gap-2">
                            <Link2 className="mt-0.5 h-4 w-4 text-zinc-500" />
                            <div className="space-y-1">
                              <p className="font-medium text-zinc-300">联系方式（合规保护）</p>
                              <p>{isPending ? "确认后可见" : item.maskedContact}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="pt-0">
                        {isPending ? (
                          <Button
                            type="button"
                            onClick={() => setConfirmTarget(item)}
                            disabled={isSubmitting}
                            className="min-w-[136px] bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                          >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            确认匹配
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
        <AlertDialogContent className="border-white/10 bg-zinc-900/90 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-50">确认匹配并进入后续流程？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              确认后将向对方展示您的联系方式并进入后续流程，是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmMutation.isPending || !confirmTarget}
              className="min-w-[92px]"
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
              {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              继续
            </AlertDialogAction>
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
