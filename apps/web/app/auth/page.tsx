"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getUserApi } from "../../src/api";
import { useUserStore } from "../../src/stores/user-store";
import { getErrorMessage } from "../../src/utils/error-message";

const formSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, "请输入11位中国大陆手机号"),
  verifyCode: z.string().regex(/^\d{4,6}$/, "验证码需为4-6位数字")
});

type FormValues = z.infer<typeof formSchema>;
type AuthMode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
      phone: "13800000000",
      verifyCode: "1234"
    }
  });

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
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        await getUserApi().register(parsed.data);
        setMessage("注册成功，请继续登录。");
        setMode("login");
        return;
      }

      const result = await getUserApi().login(parsed.data);
      setLogin({
        token: result.token,
        phone: parsed.data.phone
      });
      setMessage("登录成功，正在跳转...");
      router.replace(redirectTo);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
      <h1 className="text-2xl font-semibold text-slate-900">登录 / 注册</h1>
      <p className="mt-2 text-sm text-slate-600">MVP 阶段：手机号 + 验证码认证。</p>

      <div className="mt-5 inline-flex rounded-full bg-slate-100 p-1">
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm ${mode === "login" ? "bg-blue-600 text-white" : "text-slate-700"}`}
          onClick={() => setMode("login")}
        >
          登录
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm ${mode === "register" ? "bg-blue-600 text-white" : "text-slate-700"}`}
          onClick={() => setMode("register")}
        >
          注册
        </button>
      </div>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">手机号</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-blue-500 focus:ring-2"
            {...form.register("phone")}
          />
          {form.formState.errors.phone ? (
            <span className="mt-1 block text-xs text-rose-600">
              {form.formState.errors.phone.message}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">验证码</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-blue-500 focus:ring-2"
            {...form.register("verifyCode")}
          />
          {form.formState.errors.verifyCode ? (
            <span className="mt-1 block text-xs text-rose-600">
              {form.formState.errors.verifyCode.message}
            </span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "提交中..." : mode === "login" ? "立即登录" : "立即注册"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-5 text-sm text-slate-600">
        <Link href="/" className="text-blue-700 hover:underline">
          返回首页
        </Link>
      </div>
    </section>
  );
}
