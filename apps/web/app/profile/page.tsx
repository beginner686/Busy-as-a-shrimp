"use client";

import {
  Cpu,
  Minus,
  Network,
  PencilLine,
  Plus,
  Rocket,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Upload
} from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getUserApi } from "../../src/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../src/components/ui/dialog";
import { toast } from "../../src/hooks/use-toast";
import { useAuthStatus } from "../../src/stores/use-auth-status";
import { useUserStore, type UserRole } from "../../src/stores/user-store";
import { getErrorMessage } from "../../src/utils/error-message";

const PROFILE_QUERY_KEY = ["user", "profile"] as const;

function maskPhone(phone: string): string {
  if (!phone) {
    return "138****9999";
  }
  if (phone.length < 7) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function getMemberBadgeClass(memberLevel: "FREE" | "PRO" | "LIFETIME"): string {
  if (memberLevel === "PRO") {
    return "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]";
  }
  if (memberLevel === "LIFETIME") {
    return "border border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]";
  }
  return "border border-white/10 bg-white/5 text-zinc-400";
}

function getMemberLabel(memberLevel: "FREE" | "PRO" | "LIFETIME"): string {
  if (memberLevel === "PRO") {
    return "PRO PASS";
  }
  if (memberLevel === "LIFETIME") {
    return "LIFETIME NODE";
  }
  return "FREE";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      reject(new Error("文件读取失败"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { hydrated, isLoggedIn, token, phone } = useAuthStatus();
  const role = useUserStore((state) => state.role);
  const memberLevel = useUserStore((state) => state.memberLevel);
  const avatar = useUserStore((state) => state.avatar);
  const setAvatar = useUserStore((state) => state.setAvatar);
  const setRole = useUserStore((state) => state.setRole);
  const isRealNameVerified = useUserStore((state) => state.isRealNameVerified);
  const setRealNameVerified = useUserStore((state) => state.setRealNameVerified);
  const queryClient = useQueryClient();

  const [cityDraft, setCityDraft] = useState<string | null>(null);
  const [district, setDistrict] = useState("");
  const [message, setMessage] = useState("");
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [realName, setRealName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(avatar);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => getUserApi().getInfo(),
    enabled: hydrated && isLoggedIn && Boolean(token)
  });

  const saveInfoMutation = useMutation({
    mutationFn: (payload: { city: string; district: string }) => getUserApi().updateInfo(payload),
    onSuccess: async () => {
      setMessage("资料已更新");
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    }
  });

  const saveRoleMutation = useMutation({
    mutationFn: (nextRole: UserRole) => getUserApi().updateRole({ role: nextRole }),
    onSuccess: async (result) => {
      setRole(result.role);
      setMessage("角色已更新");
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    }
  });

  const city = cityDraft ?? profileQuery.data?.city ?? "";
  const currentRole = profileQuery.data?.role ?? role;
  const loading = profileQuery.isFetching;
  const phoneMasked = useMemo(() => maskPhone(phone), [phone]);
  const avatarText = useMemo(() => phoneMasked.slice(-2), [phoneMasked]);

  const avatarTransformStyle = useMemo(
    () => ({
      transform: `scale(${avatarZoom}) rotate(${avatarRotation}deg)`
    }),
    [avatarRotation, avatarZoom]
  );

  const error = useMemo(() => {
    if (profileQuery.error) {
      return getErrorMessage(profileQuery.error);
    }
    if (saveInfoMutation.error) {
      return getErrorMessage(saveInfoMutation.error);
    }
    if (saveRoleMutation.error) {
      return getErrorMessage(saveRoleMutation.error);
    }
    return "";
  }, [profileQuery.error, saveInfoMutation.error, saveRoleMutation.error]);

  function resetMutationErrors() {
    if (saveInfoMutation.isError) {
      saveInfoMutation.reset();
    }
    if (saveRoleMutation.isError) {
      saveRoleMutation.reset();
    }
  }

  async function saveInfo() {
    setMessage("");
    resetMutationErrors();
    try {
      await saveInfoMutation.mutateAsync({ city, district });
    } catch {
      // Error is surfaced via mutation state.
    }
  }

  async function saveRole(nextRole: UserRole) {
    setMessage("");
    resetMutationErrors();
    try {
      await saveRoleMutation.mutateAsync(nextRole);
    } catch {
      // Error is surfaced via mutation state.
    }
  }

  async function verifyRealName() {
    const name = realName.trim();
    const card = idCard.trim();

    if (!name || !card) {
      toast({
        title: "信息不完整",
        description: "请先填写真实姓名和身份证号",
        variant: "destructive"
      });
      return;
    }

    setMessage("");
    setVerifying(true);
    try {
      const res = await getUserApi().verifyIdentity({ idNumber: card, name });
      if (res.success) {
        setRealNameVerified(true);
        setVerifyDialogOpen(false);
        setRealName("");
        setIdCard("");
        toast({
          title: "实名校验通过",
          description: "认证状态已更新。"
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "请求异常";
      toast({
        title: "实名校验失败",
        description: message,
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  }

  function openAvatarDialog() {
    setAvatarDraft(avatar);
    setAvatarZoom(1);
    setAvatarRotation(0);
    setAvatarDialogOpen(true);
  }

  async function onSelectAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAvatarDraft(dataUrl);
      setAvatarZoom(1);
      setAvatarRotation(0);
    } catch {
      toast({
        variant: "destructive",
        title: "图片读取失败",
        description: "请重新选择图片。"
      });
    } finally {
      event.target.value = "";
    }
  }

  async function confirmAvatarUpload() {
    if (!avatarDraft) {
      toast({
        variant: "destructive",
        title: "请先选择图片",
        description: "未检测到可上传的头像。"
      });
      return;
    }

    setAvatarUploading(true);
    try {
      await sleep(1500);
      setAvatar(avatarDraft);
      setAvatarDialogOpen(false);
      toast({
        title: "头像更新成功",
        description: "新头像已同步到本地状态。"
      });
    } finally {
      setAvatarUploading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-[calc(100vh-64px)] relative overflow-hidden bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/40 via-black to-black -mx-4 -mt-4 px-4 py-8 md:-mx-6 md:-mt-5 md:px-6">
        <section className="relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-white/10 border-t-cyan-500/30 bg-zinc-900/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-white">个人指挥中枢</h1>
          <p className="mt-2 text-sm text-zinc-400">正在初始化登录状态...</p>
        </section>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-[calc(100vh-64px)] relative overflow-hidden bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/40 via-black to-black -mx-4 -mt-4 px-4 py-8 md:-mx-6 md:-mt-5 md:px-6">
        <section className="relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-white/10 border-t-cyan-500/30 bg-zinc-900/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-white">个人指挥中枢</h1>
          <p className="mt-2 text-sm text-zinc-400">当前未登录，请先完成认证。</p>
          <Link
            href="/auth"
            className="mt-6 inline-flex rounded-xl bg-cyan-500 px-6 py-3 font-semibold tracking-wide text-black shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]"
          >
            去登录
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] relative overflow-hidden bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/40 via-black to-black -mx-4 -mt-4 px-4 py-8 md:-mx-6 md:-mt-5 md:px-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
            个人指挥中枢 (Command Hub)
          </h1>
          <p className="text-sm text-zinc-400">
            用户、资源、匹配、会员与团长网络的一体化控制视图。
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <aside className="space-y-5 rounded-3xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-3xl">
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-3 text-center">
                <button
                  type="button"
                  onClick={openAvatarDialog}
                  className="group relative h-24 w-24 overflow-hidden rounded-full border border-cyan-400/25 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
                >
                  {avatar ? (
                    <img src={avatar} alt="用户头像" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-cyan-300">
                      {avatarText}
                    </div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <PencilLine className="h-4 w-4 text-zinc-100" />
                    <span className="text-[11px] font-medium text-zinc-100">修改头像</span>
                  </div>
                </button>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{phoneMasked}</p>
                  <p className="text-xs text-zinc-500">Identity Node Online</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isRealNameVerified ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border border-orange-500/20 bg-orange-500/10 text-orange-400"}`}
                  >
                    {isRealNameVerified ? "已实名认证" : "未实名"}
                  </span>
                  {!isRealNameVerified ? (
                    <button
                      type="button"
                      onClick={() => setVerifyDialogOpen(true)}
                      className="rounded-lg bg-cyan-500 px-2.5 py-1 text-xs font-semibold text-black transition-all hover:bg-cyan-400"
                    >
                      去认证
                    </button>
                  ) : null}
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span className="text-xs text-zinc-500">通行证级别</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getMemberBadgeClass(memberLevel)}`}
                  >
                    {getMemberLabel(memberLevel)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                资料编辑区
              </p>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    城市
                  </span>
                  <input
                    value={city}
                    onChange={(event) => setCityDraft(event.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-black/50 px-4 py-2.5 text-white placeholder:text-zinc-600 transition-all focus:border-cyan-500/50 focus:bg-black/70 focus:ring-1 focus:ring-cyan-500/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    区县
                  </span>
                  <input
                    value={district}
                    onChange={(event) => setDistrict(event.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-black/50 px-4 py-2.5 text-white placeholder:text-zinc-600 transition-all focus:border-cyan-500/50 focus:bg-black/70 focus:ring-1 focus:ring-cyan-500/50"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void saveInfo()}
                className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-6 py-2.5 font-semibold tracking-wide text-black shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]"
              >
                保存资料
              </button>
            </div>

            {loading ? <p className="font-mono text-sm text-zinc-400">加载中...</p> : null}
            {error ? <p className="font-mono text-sm text-rose-400">{error}</p> : null}
            {message ? <p className="font-mono text-sm text-emerald-400">{message}</p> : null}
          </aside>

          <div className="space-y-6 lg:col-span-2">
            <section className="grid grid-cols-2 gap-4">
              <article className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 backdrop-blur-2xl">
                <p className="text-xs text-zinc-500">已发布资源</p>
                <p className="mt-1 font-mono text-3xl font-bold text-zinc-100">12</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 backdrop-blur-2xl">
                <p className="text-xs text-zinc-500">活跃匹配中</p>
                <p className="mt-1 font-mono text-3xl font-bold text-zinc-100">3</p>
              </article>
              <article className="rounded-2xl border border-emerald-500/20 bg-zinc-900/40 p-4 backdrop-blur-2xl">
                <p className="text-xs text-zinc-500">累计信誉分</p>
                <p className="mt-1 font-mono text-3xl font-bold text-emerald-400">98</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 backdrop-blur-2xl">
                <p className="text-xs text-zinc-500">下属节点数</p>
                <p className="mt-1 font-mono text-3xl font-bold text-zinc-100">24</p>
              </article>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <Link
                href="/member"
                className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-5 transition-all hover:-translate-y-1 hover:border-cyan-400/40"
              >
                <div className="absolute right-4 top-4 h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300" />
                <div className="flex items-center gap-2 text-cyan-300">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-mono tracking-wider">MEMBER PORTAL</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-zinc-100">星际通行证入口</h3>
                <p className="mt-1 text-sm text-zinc-400">升级算力与特权</p>
              </Link>

              <Link
                href="/captain"
                className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-zinc-900/40 p-5 transition-all hover:-translate-y-1 hover:border-emerald-400/40"
              >
                <div className="flex items-center gap-2 text-emerald-300">
                  <Rocket className="h-4 w-4" />
                  <span className="text-xs font-mono tracking-wider">CAPTAIN CORE</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-zinc-100">团长中枢入口</h3>
                <p className="mt-1 text-sm text-zinc-400">查看我的财富流水</p>
              </Link>
            </section>

            <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-2xl">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Role Engine
                </p>
                <h3 className="text-lg font-semibold text-zinc-100">当前网络拓扑角色</h3>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${currentRole === "service" ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]" : "border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"}`}
                  onClick={() => void saveRole("service")}
                >
                  服务方
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${currentRole === "resource" ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]" : "border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"}`}
                  onClick={() => void saveRole("resource")}
                >
                  资源方
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${currentRole === "both" ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]" : "border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"}`}
                  onClick={() => void saveRole("both")}
                >
                  双角色
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-xs text-zinc-500">用户引擎</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-zinc-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-400/80" />
                    身份域运行中
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-xs text-zinc-500">匹配引擎</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-zinc-300">
                    <Cpu className="h-3.5 w-3.5 text-cyan-400/80" />
                    调度稳定
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-xs text-zinc-500">生态网络</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-zinc-300">
                    <Network className="h-3.5 w-3.5 text-cyan-400/80" />
                    节点同步中
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <Dialog
          open={avatarDialogOpen}
          onOpenChange={(open) => {
            if (avatarUploading) {
              return;
            }
            setAvatarDialogOpen(open);
          }}
        >
          <DialogContent className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-3xl sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white">赛博头像裁剪台</DialogTitle>
              <DialogDescription className="text-zinc-400">
                模拟若依式裁剪工作台：左侧主预览，右侧实时裁剪快照。
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2 md:grid-cols-[minmax(0,1fr)_240px]">
              <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {avatarDraft ? (
                  <img
                    src={avatarDraft}
                    alt="头像主预览"
                    className="h-full w-full object-cover transition-transform duration-200"
                    style={avatarTransformStyle}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <Upload className="h-7 w-7" />
                    <p className="text-xs">请选择图片</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    预览 A
                  </p>
                  <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border border-cyan-500/30 bg-zinc-800">
                    {avatarDraft ? (
                      <img
                        src={avatarDraft}
                        alt="头像预览大图"
                        className="h-full w-full object-cover transition-transform duration-200"
                        style={avatarTransformStyle}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    预览 B
                  </p>
                  <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border border-cyan-500/30 bg-zinc-800">
                    {avatarDraft ? (
                      <img
                        src={avatarDraft}
                        alt="头像预览小图"
                        className="h-full w-full object-cover transition-transform duration-200"
                        style={avatarTransformStyle}
                      />
                    ) : null}
                  </div>
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    void onSelectAvatarFile(event);
                  }}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition-all hover:bg-white/10"
                  >
                    选择图片
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAvatarZoom((value) => Math.min(2.4, Number((value + 0.1).toFixed(2))))
                    }
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition-all hover:bg-white/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    放大
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAvatarZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(2))))
                    }
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition-all hover:bg-white/10"
                  >
                    <Minus className="h-3.5 w-3.5" />
                    缩小
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarRotation((value) => value + 90)}
                    className="col-span-2 inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition-all hover:bg-white/10"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    旋转
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                disabled={avatarUploading}
                onClick={() => setAvatarDialogOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void confirmAvatarUpload()}
                disabled={avatarUploading}
                className="inline-flex min-w-[160px] items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {avatarUploading ? "Processing..." : "确认上传"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent className="border border-white/10 bg-zinc-900/40 text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-3xl sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">实名认证</DialogTitle>
              <DialogDescription className="text-zinc-400">
                输入真实姓名和身份证号，调用公安网比对（Mock）。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  真实姓名
                </span>
                <input
                  value={realName}
                  onChange={(event) => setRealName(event.target.value)}
                  placeholder="请输入真实姓名"
                  className="w-full rounded-xl border border-white/5 bg-black/50 px-4 py-2.5 text-white placeholder:text-zinc-600 transition-all focus:border-cyan-500/50 focus:bg-black/70 focus:ring-1 focus:ring-cyan-500/50"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  身份证号
                </span>
                <input
                  value={idCard}
                  onChange={(event) => setIdCard(event.target.value)}
                  placeholder="请输入身份证号"
                  className="w-full rounded-xl border border-white/5 bg-black/50 px-4 py-2.5 text-white placeholder:text-zinc-600 transition-all focus:border-cyan-500/50 focus:bg-black/70 focus:ring-1 focus:ring-cyan-500/50"
                />
              </label>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => void verifyRealName()}
                disabled={verifying}
                className="inline-flex min-w-[200px] items-center justify-center rounded-xl bg-cyan-500 px-6 py-3 font-semibold tracking-wide text-black shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying ? "比对中..." : "提交实名"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
