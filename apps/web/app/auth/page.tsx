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

type FormValues = z.infer<typeof formSchema>;

export default function AuthPage() {
  const captchaRef = useRef<CaptchaInputRef>(null);
  const smsInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [redirectTo, setRedirectTo] = useState("/");
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
      const field = issue.path[0] as keyof FormValues;
      if (field === "phone" || field === "captchaValue" || field === "smsCode") {
        form.setError(field, {
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
      const message = getErrorMessage(error);
      toast({
        variant: "destructive",
        title: "短信发送失败",
        description: message
      });
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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-zinc-950/80 p-4 sm:p-6 backdrop-blur-[2px]">
      {/* 极客氛围灯光层 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[15%] h-[500px] w-[500px] -translate-x-[60%] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute right-1/4 bottom-[10%] h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/10 bg-zinc-900/40 p-8 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-3xl ring-1 ring-white/[0.02] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-300/30 before:to-transparent sm:p-12">
        <header className="space-y-3 pb-8 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold tracking-tighter text-white sm:text-3xl">
            免密登录 / 注册
          </h1>
          <p className="text-sm tracking-tight text-zinc-400">未注册的手机号验证后将自动创建账号</p>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <FormItem className="space-y-2">
                  <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
                    手机号
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Phone className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-cyan-500/70" />
                      <Input
                        {...field}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={11}
                        placeholder="请输入您的手机号"
                        className="h-11 rounded-xl border border-white/5 bg-black/40 pl-10 text-zinc-100 placeholder:text-zinc-700 transition-all duration-300 hover:bg-black/60 focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]"
                        onChange={(event) => {
                          const next = event.target.value.replace(/\D/g, "").slice(0, 11);
                          field.onChange(next);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px] font-medium text-rose-500/80 ml-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="captchaValue"
              rules={{
                validate: (value) => {
                  const result = formSchema.shape.captchaValue.safeParse(value);
                  return result.success || result.error.issues[0]?.message || "请输入图形验证码";
                }
              }}
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
                    图形验证码
                  </FormLabel>
                  <FormControl>
                    <CaptchaInput
                      ref={captchaRef}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="验证码"
                      maxLength={4}
                      className="h-11 rounded-xl"
                      onCaptchaIdChange={handleCaptchaIdChange}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px] font-medium text-rose-500/80 ml-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="smsCode"
              rules={{
                validate: (value) => {
                  const result = formSchema.shape.smsCode.safeParse(value);
                  return result.success || result.error.issues[0]?.message || "请输入短信验证码";
                }
              }}
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
                    短信验证码
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <div className="relative flex-1 group">
                        <MessageSquare className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-cyan-500/70" />
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
                          placeholder="6 位验证码"
                          className="h-11 rounded-xl border border-white/5 bg-black/40 pl-10 text-zinc-100 placeholder:text-zinc-700 transition-all duration-300 hover:bg-black/60 focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]"
                          onChange={(event) => {
                            const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                            field.onChange(next);
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 min-w-[124px] rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-bold tracking-tight text-zinc-300 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white disabled:translate-y-0 disabled:opacity-40"
                        disabled={sendingSms || smsCooldown > 0}
                        onClick={() => void onSendSms()}
                      >
                        {sendingSms ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : smsCooldown > 0 ? (
                          `${smsCooldown}s`
                        ) : (
                          "获取验证码"
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px] font-medium text-rose-500/80 ml-1" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-cyan-500 font-extrabold tracking-[0.1em] text-black shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? "VERIFYING..." : "立即进入中心"}
            </Button>
          </form>
        </Form>

        <footer className="mt-8 flex justify-center">
          <Link
            href="/"
            className="group flex items-center gap-2 text-xs font-semibold tracking-widest text-zinc-600 transition-colors hover:text-zinc-400"
          >
            <div className="h-px w-4 bg-zinc-800 transition-colors group-hover:bg-zinc-600" />
            BACK TO BASE
          </Link>
        </footer>
      </div>
    </section>
  );
}
