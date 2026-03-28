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

      const url = new URL("http://localhost:3002/login");
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
    <section className="relative isolate -mx-4 flex min-h-[calc(100vh-6rem)] items-center justify-center overflow-hidden bg-zinc-50 px-4 py-12 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[12%] h-[34rem] w-[34rem] -translate-x-[72%] rounded-full bg-blue-100/50 blur-[100px]" />
        <div className="absolute left-1/2 top-[18%] h-[32rem] w-[32rem] translate-x-[20%] rounded-full bg-cyan-100/50 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[34rem] rounded-[2rem] bg-white/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-100 backdrop-blur-xl sm:p-10">
        <header className="space-y-2 pb-7">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">虾忙 AI 资源共享</h1>
          <p className="text-sm leading-6 text-zinc-500">身份验证系统</p>
        </header>

        <Tabs
          defaultValue="user"
          onValueChange={(value) => setLoginMode(value as "user" | "admin")}
        >
          <TabsList className="mb-8 grid w-full grid-cols-2">
            <TabsTrigger value="user">普通用户</TabsTrigger>
            <TabsTrigger value="admin">后台管理</TabsTrigger>
          </TabsList>

          <TabsContent value="user">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="phone"
                  rules={{
                    validate: (value) => {
                      const result = formSchema.shape.phone.safeParse(value);
                      return result.success || result.error.issues[0]?.message || "请输入手机号码";
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手机号</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            maxLength={11}
                            placeholder="请输入手机号"
                            className="h-11 rounded-xl border border-transparent bg-zinc-50/50 pl-9 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100"
                            onChange={(event) => {
                              const next = event.target.value.replace(/\D/g, "").slice(0, 11);
                              field.onChange(next);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    <FormItem>
                      <FormLabel>图形验证码</FormLabel>
                      <FormControl>
                        <CaptchaInput
                          ref={captchaRef}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="输入4位图形验证码"
                          maxLength={4}
                          className="h-11 rounded-xl border border-transparent bg-zinc-50/50 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100"
                          onCaptchaIdChange={handleCaptchaIdChange}
                        />
                      </FormControl>
                      <FormMessage />
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
                    <FormItem>
                      <FormLabel>短信验证码</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <MessageSquare className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
                              placeholder="请输入短信验证码"
                              className="h-11 rounded-xl border border-transparent bg-zinc-50/50 pl-9 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100"
                              onChange={(event) => {
                                const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                                field.onChange(next);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-11 min-w-[132px] shrink-0 rounded-xl border border-zinc-200 bg-white/80 px-3 text-zinc-700 shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.4)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-zinc-100/80 hover:text-zinc-900 hover:shadow-[0_8px_20px_rgba(24,24,27,0.08)] disabled:translate-y-0 disabled:opacity-60"
                            disabled={sendingSms || smsCooldown > 0 || loginMode !== "user"}
                            onClick={() => void onSendSms()}
                          >
                            {sendingSms ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                发送中...
                              </>
                            ) : smsCooldown > 0 ? (
                              `${smsCooldown}s后重试`
                            ) : (
                              "获取短信验证码"
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <p className="pt-1 text-xs text-zinc-500">未注册的手机号验证后将自动创建账号</p>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950 text-white shadow-[0_12px_28px_rgba(24,24,27,0.22),inset_0px_1px_0px_0px_rgba(255,255,255,0.1)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_32px_rgba(24,24,27,0.28),inset_0px_1px_0px_0px_rgba(255,255,255,0.1)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-70"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "登录中..." : "登录 / 注册"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="admin">
            <Form {...adminForm}>
              <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
                <FormField
                  control={adminForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>账号</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="管理员账号"
                          className="h-11 rounded-xl border border-transparent bg-zinc-50/50 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adminForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          placeholder="登录密码"
                          className="h-11 rounded-xl border border-transparent bg-zinc-50/50 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950 text-white shadow-[0_12px_28px_rgba(24,24,27,0.22),inset_0px_1px_0px_0px_rgba(255,255,255,0.1)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_32px_rgba(24,24,27,0.28),inset_0px_1px_0px_0px_rgba(255,255,255,0.1)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-70"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "登录中..." : "进入管理系统"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <footer className="pt-5">
          <Button
            asChild
            variant="ghost"
            className="h-9 px-1 text-sm text-zinc-500 transition-colors hover:bg-transparent hover:text-zinc-800"
          >
            <Link href="/">返回首页</Link>
          </Button>
        </footer>
      </div>
    </section>
  );
}
