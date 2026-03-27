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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";
import type { AdminLoginResult } from "@/api/user-api";

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
        form.setError(field as any, {
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

  async function onAdminSubmit(values: AdminFormValues) {
    setSubmitting(true);
    try {
      const result = await (getUserApi() as any).adminLogin({
        username: values.username,
        password: values.password
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
    <section className="mx-auto w-full max-w-md">
      <Card className="border-white/70 bg-white/75 shadow-xl backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">虾忙 AI 资源共享</CardTitle>
          <CardDescription>身份验证系统</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="user" onValueChange={(v) => setLoginMode(v as "user" | "admin")}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="user">普通用户</TabsTrigger>
              <TabsTrigger value="admin">后台管理</TabsTrigger>
            </TabsList>

            <TabsContent value="user">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>手机号</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="tel"
                              placeholder="11 位手机号"
                              className="pl-9"
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>图形验证码</FormLabel>
                        <FormControl>
                          <CaptchaInput
                            ref={captchaRef}
                            value={field.value}
                            onChange={field.onChange}
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
                                placeholder="输入短信验证码"
                                className="pl-9"
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={sendingSms || smsCooldown > 0}
                              onClick={onSendSms}
                            >
                              {sendingSms ? "..." : smsCooldown > 0 ? `${smsCooldown}s` : "获取验证码"}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "正在登录..." : "登 录"}
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
                          <Input {...field} placeholder="管理员账号" />
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
                          <Input type="password" {...field} placeholder="登录密码" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "身份验证中..." : "进入管理系统"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
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
