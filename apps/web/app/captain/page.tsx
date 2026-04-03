"use client";

import { motion } from "framer-motion";
import { Copy, Crown, Sparkles, UsersRound, Wallet2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import type { CaptainCommissionRecord } from "@/api/user-api";

type CommissionStatus = "PAID" | "PENDING" | "INVALID" | "active" | "paid" | "pending";

type CommissionLog = {
  id: number;
  phoneMasked: string;
  timestamp: string;
  amount: number;
  status: CommissionStatus;
};

function getStatusBadgeClass(status: CommissionStatus): string {
  if (status === "PAID" || status === "paid" || status === "active") {
    return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  }
  if (status === "PENDING" || status === "pending") {
    return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  }
  return "bg-rose-500/10 text-rose-400 border border-rose-500/20 line-through";
}

function getStatusLabel(status: CommissionStatus): string {
  if (status === "PAID" || status === "paid" || status === "active") {
    return "PAID";
  }
  if (status === "PENDING" || status === "pending") {
    return "PENDING";
  }
  return "INVALID";
}

function formatAmount(amount: number | string): string {
  if (typeof amount === "number") return amount.toFixed(2);
  const n = Number(amount);
  return isNaN(n) ? "0.00" : n.toFixed(2);
}

export default function CaptainPage() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ validInvites: 0, totalCommission: 0 });
  const [info, setInfo] = useState({ level: "normal", inviteLink: "" });
  const [logs, setLogs] = useState<CommissionLog[]>([]);

  useEffect(() => {
    import("@/api").then(({ getUserApi }) => {
      Promise.all([
        getUserApi()
          .getCaptainInfo()
          .catch(() => null),
        getUserApi()
          .getCaptainStats()
          .catch(() => null),
        getUserApi()
          .getCaptainCommissions()
          .catch(() => null)
      ]).then(([infoData, statsData, commData]) => {
        if (infoData) {
          setInfo({
            level: infoData.level || "normal",
            inviteLink: infoData.inviteLink || ""
          });
        }
        if (statsData) {
          setStats((prev) => ({ ...prev, validInvites: statsData.validInvites || 0 }));
        }
        if (commData) {
          setStats((prev) => ({ ...prev, totalCommission: commData.summary?.paidAmount || 0 }));
          if (commData.records && Array.isArray(commData.records)) {
            setLogs(
              commData.records.map((r: CaptainCommissionRecord) => ({
                id: r.commissionId,
                phoneMasked: "User " + r.orderId,
                timestamp: r.confirmedAt ? new Date(r.confirmedAt).toLocaleString() : "",
                amount: r.commissionAmount,
                status: r.status as CommissionStatus
              }))
            );
          }
        }
        setLoading(false);
      });
    });
  }, []);

  async function handleCopyInviteLink() {
    try {
      await navigator.clipboard.writeText(info.inviteLink);
      setCopied(true);
      toast({
        title: "复制成功",
        description: "邀请链接已写入剪贴板。"
      });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: "浏览器未授予剪贴板权限。"
      });
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-zinc-400 font-mono">Loading Neural Links...</div>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 py-10">
      <header className="space-y-2">
        <p className="text-xs font-mono tracking-[0.25em] text-cyan-400/70">CAPTAIN CENTER</p>
        <h1 className="text-3xl font-bold tracking-tighter text-zinc-50">
          星际团长中枢 (Captain Nexus)
        </h1>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 shadow-2xl backdrop-blur-2xl"
        >
          <div className="mb-6 inline-flex rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2.5 text-emerald-400">
            <Wallet2 className="h-4 w-4" />
          </div>
          <p className="bg-gradient-to-br from-emerald-400 to-cyan-500 bg-clip-text font-mono text-5xl font-black text-transparent">
            ¥{formatAmount(stats.totalCommission)}
          </p>
          <p className="mt-2 text-xs tracking-widest text-zinc-400">总计赚取 (CNY)</p>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
          className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 shadow-2xl backdrop-blur-2xl"
        >
          <div className="mb-6 inline-flex rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-2.5 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.18)]">
            <UsersRound className="h-4 w-4" />
          </div>
          <p className="font-mono text-3xl font-bold tracking-tight text-zinc-100">
            {stats.validInvites}
          </p>
          <p className="mt-2 text-xs tracking-widest text-zinc-400">有效邀请</p>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16, ease: "easeOut" }}
          className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 shadow-2xl backdrop-blur-2xl"
        >
          <div className="mb-6 inline-flex rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-300">
            <Crown className="h-4 w-4" />
          </div>
          <p className="text-xl font-semibold text-zinc-100">
            团长等级 ({info.level.toUpperCase()} Tier)
          </p>
          <span className="mt-3 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.16)]">
            {info.level.toUpperCase()} LEVEL
          </span>
        </motion.article>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.2, ease: "easeOut" }}
        className="flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-black/60 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <p className="text-[11px] font-mono tracking-[0.2em] text-cyan-400/70">INVITE ENGINE</p>
          <p className="font-mono text-sm text-zinc-400">{info.inviteLink || "---"}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleCopyInviteLink()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-400 transition-all hover:bg-cyan-500 hover:text-black"
        >
          <Copy className="h-4 w-4" />
          {copied ? "已复制" : "复制链接"}
        </button>
      </motion.section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-zinc-200">
          <Sparkles className="h-4 w-4 text-cyan-400/80" />
          <h2 className="text-lg font-semibold tracking-tight">佣金状态机流水</h2>
        </div>

        <div className="space-y-2">
          {logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: index * 0.06, ease: "easeOut" }}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 p-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-mono text-sm text-zinc-100">{log.phoneMasked}</p>
                <p className="text-xs text-zinc-500">{log.timestamp || "处理中"}</p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wider ${getStatusBadgeClass(log.status)}`}
                >
                  {getStatusLabel(log.status)}
                </span>
                <span
                  className={`font-mono text-sm font-semibold ${log.status === "INVALID" ? "text-zinc-500 line-through" : "text-emerald-300"}`}
                >
                  +¥{formatAmount(log.amount)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
