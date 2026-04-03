"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Crown, Loader2, Sparkles, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { toast } from "@/hooks/use-toast";
import { useUserStore, type MemberLevel } from "@/stores/user-store";
import type { MembershipPlan } from "@/api/user-api";

type TierFeature = {
  label: string;
  enabled: boolean;
};

type TierStyle = {
  className: string;
  badge?: string;
  buttonClassName: string;
  features: TierFeature[];
  subtitle: string;
};

/* 方案 code 到前端展示级别的映射 */
function planCodeToLevel(code: string): MemberLevel {
  if (code === "monthly" || code === "PRO") return "PRO";
  if (code === "lifetime" || code === "LIFETIME" || code === "yearly") return "LIFETIME";
  return "FREE";
}

/* 后端价格格式化 */
function formatPrice(price: number, code: string): string {
  if (price <= 0) return "¥0";
  if (code === "monthly") return `¥${price} / 月`;
  if (code === "yearly") return `¥${price} / 年`;
  return `¥${price}`;
}

/* 各方案的视觉风格配置 */
const TIER_STYLES: Record<string, TierStyle> = {
  free: {
    className: "bg-zinc-900/30 border border-white/5",
    buttonClassName: "bg-white/5 text-zinc-400 hover:bg-white/10",
    subtitle: "基础试用权限",
    features: [
      { label: "每日基础匹配 5 次", enabled: true },
      { label: "普通推荐池曝光", enabled: true },
      { label: "优先 AI 调度通道", enabled: false },
      { label: "专属客服与极速审核", enabled: false }
    ]
  },
  monthly: {
    className:
      "relative scale-105 bg-cyan-950/20 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]",
    badge: "[ MOST POPULAR ]",
    buttonClassName: "bg-cyan-500 text-black hover:bg-cyan-400",
    subtitle: "高频匹配与策略加速",
    features: [
      { label: "每日高级匹配 120 次", enabled: true },
      { label: "优先流量加权推荐", enabled: true },
      { label: "AI 内容策略建议", enabled: true },
      { label: "实时佣金追踪看板", enabled: true }
    ]
  },
  yearly: {
    className:
      "relative bg-indigo-950/20 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.12)]",
    buttonClassName: "bg-indigo-500 text-white hover:bg-indigo-400",
    subtitle: "年度特惠与深度赋能",
    features: [
      { label: "全年高级匹配无限制", enabled: true },
      { label: "专属调度策略白名单", enabled: true },
      { label: "AI 内容策略建议", enabled: true },
      { label: "年度专属勋章", enabled: true }
    ]
  },
  lifetime: {
    className: "bg-purple-950/20 border border-purple-500/30",
    buttonClassName: "bg-purple-500 text-white hover:bg-purple-400",
    subtitle: "永久权限与超维度特权",
    features: [
      { label: "终身高级匹配额度", enabled: true },
      { label: "专属调度策略白名单", enabled: true },
      { label: "团队协作多账号席位", enabled: true },
      { label: "至尊勋章与专属身份", enabled: true }
    ]
  }
};

/* 默认兜底风格 */
const DEFAULT_STYLE: TierStyle = {
  className: "bg-zinc-900/30 border border-white/10",
  buttonClassName: "bg-white/10 text-zinc-300 hover:bg-white/20",
  subtitle: "",
  features: []
};

function getLevelLabel(level: MemberLevel): string {
  if (level === "PRO") return "PRO";
  if (level === "LIFETIME") return "LIFETIME";
  return "FREE";
}

export default function MemberPage() {
  const memberLevel = useUserStore((state) => state.memberLevel);
  const setMemberLevel = useUserStore((state) => state.setMemberLevel);
  const [processingTier, setProcessingTier] = useState<MemberLevel | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  /* 挂载时从后端拉取真实方案列表 */
  useEffect(() => {
    import("@/api").then(({ getUserApi }) => {
      getUserApi()
        .getMembershipPlans()
        .then((data) => setPlans(data))
        .catch((err) => {
          console.error("获取会员方案失败", err);
          /* 兜底：使用本地硬编码方案 */
          setPlans([
            { code: "free", name: "免费版", price: 0 },
            { code: "monthly", name: "月度会员", price: 99 },
            { code: "lifetime", name: "终身版", price: 1999 }
          ]);
        })
        .finally(() => setLoadingPlans(false));
    });
  }, []);

  async function handleUpgrade(planCode: string, level: MemberLevel) {
    if (level === "FREE") return;
    setProcessingTier(level);

    try {
      const { getUserApi } = await import("@/api");
      const result = await getUserApi().subscribePlan(planCode);

      /* 使用后端返回的 memberLevel 同步到 Store */
      const newLevel = result.memberLevel;
      if (newLevel === "monthly" || newLevel === "PRO") {
        setMemberLevel("PRO");
      } else if (newLevel === "lifetime" || newLevel === "LIFETIME" || newLevel === "yearly") {
        setMemberLevel("LIFETIME");
      }

      toast({
        title: "支付/升级成功",
        description: `您的账户已升级至 ${result.memberLevel}。`
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "您可能需要先登录或者当前网络不稳定。";
      toast({
        title: "升级失败",
        description: message,
        variant: "destructive"
      });
    } finally {
      setProcessingTier(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-10 py-12">
      <header className="space-y-3 text-center">
        <h1 className="bg-gradient-to-r from-zinc-100 to-zinc-500 bg-clip-text text-4xl font-extrabold text-transparent">
          星际通行证 (Astro Pass)
        </h1>
        <p className="text-sm text-zinc-400">解锁最高维度的算力与匹配特权</p>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-mono tracking-widest text-cyan-300">
          <Sparkles className="h-3.5 w-3.5" />
          CURRENT PLAN: {getLevelLabel(memberLevel)}
        </div>
      </header>

      {loadingPlans ? (
        <div className="flex items-center justify-center gap-3 py-20 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-mono">正在加载方案...</span>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan, index) => {
            const level = planCodeToLevel(plan.code);
            const style = TIER_STYLES[plan.code] ?? DEFAULT_STYLE;
            const isCurrent = level === memberLevel;
            const canUpgrade = level !== "FREE";
            const isProcessing = processingTier === level;

            return (
              <motion.article
                key={plan.code}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.08, ease: "easeOut" }}
                className={`rounded-3xl p-6 backdrop-blur-2xl ${style.className}`}
              >
                {style.badge ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-[10px] font-mono tracking-[0.2em] text-cyan-300">
                    {style.badge}
                  </span>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-100">{plan.name}</h2>
                    {plan.code === "lifetime" ? <Crown className="h-4 w-4 text-amber-300" /> : null}
                  </div>
                  <p className="font-mono text-3xl font-bold text-zinc-50">
                    {formatPrice(plan.price, plan.code)}
                  </p>
                  <p className="text-xs text-zinc-500">{style.subtitle}</p>
                </div>

                <ul className="mt-6 space-y-2.5">
                  {style.features.map((feature) => (
                    <li
                      key={`${plan.code}-${feature.label}`}
                      className={`flex items-center gap-2 text-sm ${feature.enabled ? "text-zinc-300" : "text-zinc-600 line-through"}`}
                    >
                      {feature.enabled ? (
                        <CheckCircle2
                          className={`h-4 w-4 ${plan.code === "lifetime" ? "text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.7)]" : "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]"}`}
                        />
                      ) : (
                        <XCircle className="h-4 w-4 text-zinc-600" />
                      )}
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {canUpgrade ? (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => void handleUpgrade(plan.code, level)}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${style.buttonClassName}`}
                    >
                      {isProcessing ? (
                        <>
                          <motion.span
                            className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              duration: 0.8,
                              ease: "linear"
                            }}
                          />
                          处理中...
                        </>
                      ) : isCurrent ? (
                        "当前已开通"
                      ) : (
                        "立即开通"
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-500"
                    >
                      免费使用中
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </section>
      )}
    </main>
  );
}
