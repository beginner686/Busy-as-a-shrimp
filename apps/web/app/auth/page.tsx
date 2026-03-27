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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
      const field = issue.path[0];
      if (field === "phone" || field === "captchaValue" || field === "smsCode") {
        form.setError(field, {
          type: "manual",
          message: issue.message
        });
      }
      if (field === "captchaId") {
        form.setError("captchaValue", {
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
      if (sendResult.code) {
        form.setValue("smsCode", sendResult.code.slice(0, 6), { shouldValidate: true });
      }
      toast({
        title: "短信发送成功",
        description: sendResult.code
          ? `测试验证码：${sendResult.code}`
          : "请输入短信验证码继续登录（本地调试可使用 123456）。"
      });
      smsInputRef.current?.focus();
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.includes("图形验证码") || message.toLowerCase().includes("captcha")) {
        form.setValue("captchaValue", "");
        form.setValue("captchaId", "");
        void captchaRef.current?.refreshCaptcha();
      }
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
        description: "请检查手机号、图形验证码和短信验证码。"
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
    <section className="mx-auto w-full max-w-md">
      <Card className="border-white/70 bg-white/75 shadow-xl backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">免密登录 / 注册</CardTitle>
          <CardDescription>手机号验证码登录</CardDescription>
        </CardHeader>

        <CardContent>
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
                          className="pl-9"
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
                    return result.success || result.error.issues[0]?.message || "请输入图形验证码";
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
                    return result.success || result.error.issues[0]?.message || "请输入短信验证码";
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
                            className="pl-9"
                            onChange={(event) => {
                              const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                              field.onChange(next);
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0"
                          disabled={sendingSms || smsCooldown > 0}
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

              <p className="text-xs text-muted-foreground">未注册的手机号验证后将自动创建账号</p>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "登录中..." : "登录 / 注册"}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter>
          <Button asChild variant="ghost" className="px-0 text-sm text-muted-foreground">
            <Link href="/">返回首页</Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
