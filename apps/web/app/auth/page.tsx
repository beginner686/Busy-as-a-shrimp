"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, MessageSquare, Phone } from "lucide-react";
import { z } from "zod";

import { getUserApi } from "@/api";
import { CaptchaInput, type CaptchaInputRef } from "@/components/auth/captcha-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";

const formSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "请输入手机号码")
    .length(11, "手机号必须是 11 位")
    .regex(/^1[3-9]\d{9}$/, "请输入正确的中国大陆手机号码格式"),
  captchaValue: z
    .string()
    .min(1, "请输入图形验证码")
    .regex(/^[a-zA-Z0-9]{4}$/, "图形验证码必须是4位英文或数字"),
  captchaId: z.string().min(1, "请先获取图形验证码"),
  smsCode: z.string().regex(/^\d{4,6}$/, "短信验证码需为4-6位数字")
});

const adminFormSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码")
});

type FormValues = z.infer<typeof formSchema>;
type AdminFormValues = z.infer<typeof adminFormSchema>;

export default function AuthPage() {
  const captchaRef = useRef<CaptchaInputRef>(null);
  const smsInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [redirectTo, setRedirectTo] = useState("/");
  const [loginMode, setLoginMode] = useState<"user" | "admin">("user");
  const setLogin = useUserStore((state) => state.setLogin);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const next = new URLSearchParams(window.location.search).get("redirect") || "/";
    setRedirectTo(next);
  }, []);

  useEffect(() => {
    if (smsCooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setSmsCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [smsCooldown]);

  const form = useForm<FormValues>({
    defaultValues: {
      phone: "",
      captchaValue: "",
      captchaId: "",
      smsCode: ""
    }
  });

  const adminForm = useForm<AdminFormValues>({
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const handleCaptchaIdChange = useCallback(
    (captchaId: string) => {
      form.setValue("captchaId", captchaId, { shouldValidate: false, shouldDirty: false });
      if (captchaId) {
        form.clearErrors("captchaValue");
      }
    },
    [form]
  );

  function setZodErrors(issues: z.ZodIssue[]) {
    form.clearErrors();
    for (const issue of issues) {
      const field = issue.path[0];
      if (field === "phone" || field === "captchaValue" || field === "smsCode") {
        form.setError(field as keyof FormValues, {
          type: "manual",
          message: issue.message
        });
      }
    }
  }

  async function onSendSms() {
    const localValid = await form.trigger(["phone", "captchaValue"]);
    if (!localValid) {
      return;
    }

    const { phone, captchaValue, captchaId } = form.getValues();
    if (!captchaId) {
      form.setError("captchaValue", {
        type: "manual",
        message: "请先获取图形验证码"
      });
      return;
    }

    setSendingSms(true);
    try {
      const sendResult = await getUserApi().sendSms({
        phone,
        captchaValue,
        captchaId
      });
      setSmsCooldown(60);
      toast({
        title: "短信发送成功",
        description: sendResult.code
          ? `测试验证码：${sendResult.code}`
          : "请输入短信验证码继续登录。"
      });
      smsInputRef.current?.focus();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "短信发送失败",
        description: getErrorMessage(error)
      });
      await captchaRef.current?.refreshCaptcha();
    } finally {
      setSendingSms(false);
    }
  }

  async function onSubmit(values: FormValues) {
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      setZodErrors(parsed.error.issues);
      toast({
        variant: "destructive",
        title: "表单校验失败",
        description: "请检查您的输入。"
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await getUserApi().login({
        phone: parsed.data.phone,
        smsCode: parsed.data.smsCode
      });
      setLogin({
        token: result.token,
        phone: parsed.data.phone
      });
      toast({
        title: "登录成功",
        description: "正在跳转..."
      });
      router.replace(redirectTo);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "登录失败",
        description: getErrorMessage(error)
      });
      await captchaRef.current?.refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  async function onAdminSubmit(values: AdminFormValues) {
    const parsed = adminFormSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "username" || field === "password") {
          adminForm.setError(field, {
            type: "manual",
            message: issue.message
          });
        }
      }
      return;
    }

    setSubmitting(true);
    try {
      const result = await getUserApi().adminLogin({
        username: parsed.data.username,
        password: parsed.data.password
      });

      toast({
        title: "管理员认证成功",
        description: "正在跳转至后台管理系统..."
      });

      const url = new URL("http://localhost:3002/");
      url.searchParams.set("token", result.token);
      url.searchParams.set("profile", JSON.stringify(result.profile));
      window.location.href = url.toString();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "管理员登录失败",
        description: getErrorMessage(error)
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative isolate -mx-4 flex min-h-[calc(100vh-2rem)] items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12 sm:px-6">
      {/* 沉浸式背景环境 (The Void) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-cyan-900/10 blur-[120px] opacity-50" />
        <div className="absolute -right-1/4 -bottom-1/4 h-[800px] w-[800px] rounded-full bg-purple-900/10 blur-[120px] opacity-50" />
      </div>

      {/* 认证主控台面板 (The Terminal Panel) + 蝌蚪脉冲边框 (The Pulse Trace) */}
      <div className="relative group w-full max-w-[34rem]">
        {/* 灵动脉冲层 (Cyber Pulse Layer) - 位于卡片之下 */}
        <div className="absolute -inset-[2px] rounded-[2.6rem] overflow-hidden pointer-events-none z-0">
          {/* 大范围环境光晕 (Ambient Glow) */}
          <div className="absolute inset-[-150%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(6,182,212,0.1)_330deg,rgba(6,182,212,0.3)_360deg)] blur-3xl" />
          {/* 蝌蚪光斑 (Tadpole Body) - 头部极其明亮 (White-Cyan Hybrid) */}
          <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(34,211,238,0.8)_355deg,rgba(255,255,255,1)_360deg)] blur-md" />
        </div>

        {/* 核心认证面板 (Core Terminal Card) */}
        <div className="relative z-10 w-full rounded-[2.5rem] bg-zinc-900/60 p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] border border-white/10 border-t-cyan-500/40 backdrop-blur-3xl sm:p-10">
          <header className="space-y-3 pb-10">
            <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase">
              星际枢纽认证{" "}
              <span className="text-zinc-600 block text-lg font-medium tracking-normal normal-case">
                Nexus Auth
              </span>
            </h1>
            <p className="text-sm tracking-wide text-zinc-400 font-medium leading-relaxed">
              输入您的通讯节点凭证以建立连接
            </p>
          </header>

          <Tabs
            defaultValue="user"
            onValueChange={(value) => setLoginMode(value as "user" | "admin")}
            className="w-full"
          >
            <TabsList className="mb-10 grid w-full grid-cols-2 bg-black/40 border border-white/5 p-1.5 h-14 rounded-2xl ring-1 ring-white/5">
              <TabsTrigger
                value="user"
                className="rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all font-bold tracking-tight"
              >
                普通用户
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-purple-400 data-[state=active]:shadow-[0_0_15px_rgba(192,132,252,0.1)] transition-all font-bold tracking-tight"
              >
                后台管理
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user" className="mt-0 outline-none">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    rules={{
                      validate: (value) => {
                        const result = formSchema.shape.phone.safeParse(value);
                        return (
                          result.success || result.error.issues[0]?.message || "请输入手机号码"
                        );
                      }
                    }}
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <FormLabel className="text-zinc-400 text-xs font-bold tracking-widest uppercase ml-1">
                          节点手机号
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-cyan-500/70 transition-colors" />
                            <Input
                              {...field}
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              maxLength={11}
                              placeholder="通讯节点 (11位手机号)"
                              className="h-14 rounded-2xl bg-black/50 border border-white/5 text-white placeholder:text-zinc-700 pl-12 pr-4 transition-all focus-visible:bg-black/80 focus-visible:ring-1 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/30"
                              onChange={(event) => {
                                const next = event.target.value.replace(/\D/g, "").slice(0, 11);
                                field.onChange(next);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-rose-500/80 text-[11px] font-medium ml-1" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="captchaValue"
                      rules={{
                        validate: (value) => {
                          const result = formSchema.shape.captchaValue.safeParse(value);
                          return (
                            result.success || result.error.issues[0]?.message || "请输入图形验证码"
                          );
                        }
                      }}
                      render={({ field }) => (
                        <FormItem className="space-y-2.5">
                          <FormLabel className="text-zinc-400 text-xs font-bold tracking-widest uppercase ml-1">
                            识别码
                          </FormLabel>
                          <FormControl>
                            <CaptchaInput
                              ref={captchaRef}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              placeholder="4位图形码"
                              maxLength={4}
                              className="h-14 rounded-2xl bg-black/50 border border-white/5 text-white placeholder:text-zinc-700 px-4 transition-all focus-visible:bg-black/80 focus-visible:ring-1 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/30"
                              onCaptchaIdChange={handleCaptchaIdChange}
                            />
                          </FormControl>
                          <FormMessage className="text-rose-500/80 text-[11px] font-medium ml-1" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smsCode"
                      rules={{
                        validate: (value) => {
                          const result = formSchema.shape.smsCode.safeParse(value);
                          return (
                            result.success || result.error.issues[0]?.message || "请输入短信验证码"
                          );
                        }
                      }}
                      render={({ field }) => (
                        <FormItem className="space-y-2.5">
                          <FormLabel className="text-zinc-400 text-xs font-bold tracking-widest uppercase ml-1">
                            动态凭证
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <div className="relative flex-1 group">
                                <MessageSquare className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-cyan-500/70 transition-colors" />
                                <Input
                                  {...field}
                                  ref={(element) => {
                                    field.ref(element);
                                    smsInputRef.current = element;
                                  }}
                                  type="tel"
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  maxLength={6}
                                  placeholder="短信授权码"
                                  className="h-14 rounded-2xl bg-black/50 border border-white/5 text-white placeholder:text-zinc-700 pl-12 pr-4 transition-all focus-visible:bg-black/80 focus-visible:ring-1 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/30"
                                  onChange={(event) => {
                                    const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                                    field.onChange(next);
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                className="h-14 min-w-[124px] shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-white/10 hover:border-cyan-500/30 transition-all disabled:opacity-40"
                                disabled={sendingSms || smsCooldown > 0 || loginMode !== "user"}
                                onClick={() => void onSendSms()}
                              >
                                {sendingSms ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : smsCooldown > 0 ? (
                                  `${smsCooldown}S`
                                ) : (
                                  "获取凭证"
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-rose-500/80 text-[11px] font-medium ml-1" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-px flex-1 bg-white/5" />
                    <p className="text-[10px] text-zinc-600 font-bold tracking-wider uppercase">
                      自动注册新节点
                    </p>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  <Button
                    type="submit"
                    className="group relative h-16 w-full bg-cyan-500 text-black font-black tracking-[0.2em] rounded-2xl px-6 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] hover:bg-cyan-400 active:scale-[0.98] transition-all overflow-hidden"
                    disabled={submitting}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 uppercase">
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-1" /> : null}
                      {submitting ? "正在建立连接..." : "建立神经连接 (INITIALIZE UPLINK)"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  </Button>
                </form>
              </Form>

              {/* 微信 OAuth 模拟登录区块 */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/5" />
                  <p className="text-[10px] text-zinc-600 font-bold tracking-wider uppercase">
                    第三方快捷通道
                  </p>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <Button
                  type="button"
                  className="group relative h-14 w-full bg-[#07C160]/90 text-white font-bold tracking-wider rounded-2xl px-6 shadow-[0_0_20px_rgba(7,193,96,0.2)] hover:shadow-[0_0_40px_rgba(7,193,96,0.4)] hover:bg-[#07C160] active:scale-[0.98] transition-all overflow-hidden"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    toast({
                      title: "微信授权模拟中...",
                      description: "正在模拟 OAuth 回调流程（微信资质待审批）。"
                    });
                    await new Promise((r) => setTimeout(r, 1500));
                    setLogin({
                      token: "mock_wechat_token_" + Date.now(),
                      phone: "WeChat用户"
                    });
                    toast({
                      title: "微信登录成功（模拟）",
                      description: "正在跳转至主页面..."
                    });
                    router.replace(redirectTo);
                    setSubmitting(false);
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.534c0 2.22 1.174 4.22 3.016 5.591l-.755 2.278 2.644-1.359c.927.253 1.908.39 2.924.39.313 0 .623-.015.929-.043a5.747 5.747 0 0 1-.242-1.645c0-3.637 3.529-6.588 7.882-6.588.35 0 .695.021 1.036.06C16.874 4.813 13.117 2.188 8.691 2.188zm-2.83 4.086c.578 0 1.047.468 1.047 1.046s-.469 1.047-1.047 1.047a1.047 1.047 0 1 1 0-2.093zm5.376 0c.578 0 1.047.468 1.047 1.046s-.469 1.047-1.047 1.047a1.047 1.047 0 1 1 0-2.093zM16.398 9.17c-3.838 0-6.95 2.622-6.95 5.856 0 3.234 3.112 5.856 6.95 5.856.697 0 1.37-.095 2-.27l2.17 1.113-.614-1.86C21.646 18.584 23.348 16.8 23.348 15.026c0-3.234-3.112-5.856-6.95-5.856zm-2.371 3.393c.48 0 .87.39.87.87a.87.87 0 0 1-.87.87.87.87 0 0 1-.87-.87c0-.48.39-.87.87-.87zm4.742 0c.48 0 .87.39.87.87a.87.87 0 0 1-.87.87.87.87 0 0 1-.87-.87c0-.48.39-.87.87-.87z" />
                    </svg>
                    微信快捷登录（模拟）
                  </span>
                </Button>
                <p className="text-center text-[10px] text-zinc-700 font-mono">
                  ⓘ 微信 OAuth 资质审批中，当前为本地模拟登录
                </p>
              </div>
            </TabsContent>

            <TabsContent value="admin" className="mt-0 outline-none">
              <Form {...adminForm}>
                <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-6">
                  <FormField
                    control={adminForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <FormLabel className="text-zinc-400 text-xs font-bold tracking-widest uppercase ml-1">
                          管理员标识
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="身份代码 (ADMIN_ID)"
                            className="h-14 rounded-2xl bg-black/50 border border-white/5 text-white placeholder:text-zinc-700 px-4 transition-all focus-visible:bg-black/80 focus-visible:ring-1 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/30"
                          />
                        </FormControl>
                        <FormMessage className="text-rose-500/80 text-[11px] font-medium ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={adminForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <FormLabel className="text-zinc-400 text-xs font-bold tracking-widest uppercase ml-1">
                          访问秘钥
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            {...field}
                            placeholder="接入代码 (PASSWORD)"
                            className="h-14 rounded-2xl bg-black/50 border border-white/5 text-white placeholder:text-zinc-700 px-4 transition-all focus-visible:bg-black/80 focus-visible:ring-1 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/30"
                          />
                        </FormControl>
                        <FormMessage className="text-rose-500/80 text-[11px] font-medium ml-1" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="group relative h-16 w-full bg-purple-600 text-white font-black tracking-[0.2em] rounded-2xl px-6 shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_50px_rgba(147,51,234,0.5)] hover:bg-purple-500 active:scale-[0.98] transition-all overflow-hidden"
                    disabled={submitting}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 uppercase">
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-1" /> : null}
                      {submitting ? "正在授权..." : "建立管理链路 (ADMIN OVERRIDE)"}
                    </span>
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          <footer className="pt-8 flex justify-center">
            <Button
              asChild
              variant="ghost"
              className="h-10 px-4 text-xs font-bold tracking-widest text-zinc-600 uppercase hover:bg-white/5 hover:text-zinc-300 transition-all rounded-xl"
            >
              <Link href="/">◄ 返回星际大厅 (RETURN_TO_BASE)</Link>
            </Button>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </section>
  );
}
