"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getResourceApi } from "../../../src/api";
import { getErrorMessage } from "../../../src/utils/error-message";

interface ResourceItem {
  resourceId: number;
  resourceType: string;
  tags: string[];
  status: string;
}

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeTextList(item));
  }

  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }

  if (typeof value === "number") {
    return [String(value)];
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => normalizeTextList(item));
  }

  return [];
}

function normalizeResourceList(value: unknown): ResourceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const row = item as Record<string, unknown>;
    const parsedId = Number(row.resourceId);

    return {
      resourceId: Number.isFinite(parsedId) ? parsedId : index + 1,
      resourceType: typeof row.resourceType === "string" ? row.resourceType : "unknown",
      tags: normalizeTextList(row.tags),
      status: typeof row.status === "string" ? row.status : "unknown"
    };
  });
}

export default function ResourceListPage() {
  const resourceListQuery = useQuery({
    queryKey: ["resource", "list"],
    queryFn: () => getResourceApi().list(),
    select: normalizeResourceList
  });

  const resourceTagsQuery = useQuery({
    queryKey: ["resource", "tags"],
    queryFn: () => getResourceApi().tags(),
    select: normalizeTextList
  });

  const loading = resourceListQuery.isPending || resourceTagsQuery.isPending;
  const error = resourceListQuery.error
    ? getErrorMessage(resourceListQuery.error)
    : resourceTagsQuery.error
      ? getErrorMessage(resourceTagsQuery.error)
      : "";
  const items = resourceListQuery.data ?? [];
  const tags = resourceTagsQuery.data ?? [];

  return (
    <motion.main
      className="relative mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      <header className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-400/70">
              Resource Matrix
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">资源列表</h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right">
            <p className="text-xs text-zinc-500">资源总数</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-cyan-300">{items.length}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/5 bg-black/30 p-3">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            当前筛选标签
          </p>
          <div className="flex flex-wrap gap-2">
            {(tags.length ? tags : ["-"]).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/10 bg-zinc-900/80 px-2.5 py-1 font-mono text-xs text-cyan-300/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <>
          <p className="animate-pulse font-mono text-sm text-cyan-500">加载中...</p>
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="overflow-hidden rounded-3xl border border-white/[0.05] bg-zinc-900/40 p-6 backdrop-blur-2xl"
              >
                <div className="h-5 w-24 animate-pulse rounded-md bg-white/10" />
                <div className="mt-4 h-4 w-16 animate-pulse rounded-md bg-white/10" />
                <div className="mt-5 space-y-2 rounded-xl border border-white/[0.02] bg-black/30 p-3">
                  <div className="h-3 w-full animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}
      {error ? (
        <section className="rounded-3xl border border-rose-500/20 bg-zinc-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <h3 className="text-lg font-semibold text-zinc-100">资源加载失败</h3>
          <p className="mt-2 text-sm text-rose-400">{error}</p>
        </section>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/40 p-7 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <h3 className="text-2xl font-semibold tracking-tight text-zinc-100">暂无资源</h3>
          <p className="mt-2 text-sm text-zinc-400">当前没有可展示的资源记录。</p>
          <Link
            href="/resource/new"
            className="mt-6 inline-flex rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            去发布资源
          </Link>
        </section>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <motion.article
              key={item.resourceId}
              className="group relative overflow-hidden rounded-3xl border border-white/[0.05] bg-zinc-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 before:absolute before:left-0 before:top-0 before:h-[1px] before:w-full before:bg-gradient-to-r before:from-transparent before:via-cyan-500/20 before:to-transparent hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_15px_40px_rgba(0,0,0,0.7)]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-mono text-lg font-semibold text-zinc-100">
                  资源 #{item.resourceId}
                </h3>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-wider text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                  {item.status}
                </span>
              </div>
              <div className="mt-4 space-y-2 rounded-xl border border-white/[0.02] bg-black/30 p-3">
                <p className="text-xs text-zinc-400">类型：{item.resourceType}</p>
                <p className="text-xs text-zinc-400">
                  标签：{item.tags.length ? item.tags.join(" / ") : "-"}
                </p>
              </div>
            </motion.article>
          ))}
        </section>
      ) : null}
    </motion.main>
  );
}
