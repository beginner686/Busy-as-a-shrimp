"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { getUserApi } from "@/api";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";

const formSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, "请输入11位中国大陆手机号"),
  verifyCode: z.string().regex(/^\d{4,6}$/, "验证码需为4-6位数字")
});

type FormValues = z.infer<typeof formSchema>;
type AuthMode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [submitting, setSubmitting] = useState(false);
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

  const form = useForm<FormValues>({
    defaultValues: {
      phone: "",
      verifyCode: ""
    }
  });

  function onChangeMode(value: string) {
    if (value !== "login" && value !== "register") {
      return;
    }

    setMode(value);
    form.clearErrors();
  }

  async function onSubmit(values: FormValues) {
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      form.clearErrors();
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "phone" || field === "verifyCode") {
          form.setError(field, { type: "manual", message: issue.message });
        }
      }

      toast({
        variant: "destructive",
        title: "表单校验失败",
        description: "请检查手机号和验证码格式。"
      });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        await getUserApi().register(parsed.data);
        setMode("login");
        form.setValue("verifyCode", "");
        toast({
          title: "注册成功",
          description: "请使用相同手机号继续登录。"
        });
        return;
      }

      const result = await getUserApi().login(parsed.data);
      setLogin({
        token: result.token,
        phone: parsed.data.phone
      });
      toast({
        title: "登录成功",
        description: "正在跳转..."
      });
      router.replace(redirectTo);
    } catch (submitError) {
      toast({
        variant: "destructive",
        title: mode === "login" ? "登录失败" : "注册失败",
        description: getErrorMessage(submitError)
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md">
      <Card className="border-white/70 bg-white/75 shadow-xl backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">登录 / 注册</CardTitle>
          <CardDescription>手机号 + 验证码认证</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={onChangeMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="text-xs text-muted-foreground">
              输入手机号和验证码登录平台。
            </TabsContent>
            <TabsContent value="register" className="text-xs text-muted-foreground">
              新手机号先注册，再切换到登录完成鉴权。
            </TabsContent>
          </Tabs>

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
                        <Input placeholder="请输入手机号" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="verifyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>验证码</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ShieldCheck className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="请输入4-6位验证码" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "提交中..." : mode === "login" ? "立即登录" : "立即注册"}
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
