"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUserApi } from "../../src/api";
import { useUserStore, type UserRole } from "../../src/stores/user-store";
import { getErrorMessage } from "../../src/utils/error-message";

export default function ProfilePage() {
  const token = useUserStore((state) => state.getValidToken());
  const role = useUserStore((state) => state.role);
  const setRole = useUserStore((state) => state.setRole);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    async function loadInfo() {
      setLoading(true);
      setError("");
      try {
        const result = await getUserApi().getInfo();
        if (!active) {
          return;
        }
        setCity(result.city ?? "");
        setRole(result.role);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(getErrorMessage(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInfo();
    return () => {
      active = false;
    };
  }, [setRole, token]);

  if (!token) {
    return (
      <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
        <h1 className="text-2xl font-semibold text-slate-900">个人资料</h1>
        <p className="mt-2 text-sm text-slate-600">当前未登录，请先完成认证。</p>
        <Link
          href="/auth"
          className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-white"
        >
          去登录
        </Link>
      </section>
    );
  }

  async function saveInfo() {
    setMessage("");
    setError("");
    try {
      await getUserApi().updateInfo({ city, district });
      setMessage("资料已更新");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  }

  async function saveRole(nextRole: UserRole) {
    setMessage("");
    setError("");
    try {
      const result = await getUserApi().updateRole({ role: nextRole });
      setRole(result.role);
      setMessage("角色已更新");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  }

  return (
    <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
      <h1 className="text-2xl font-semibold text-slate-900">个人资料</h1>
      <p className="mt-2 text-sm text-slate-600">登录状态下可更新资料和角色。</p>

      {loading ? <p className="mt-3 text-sm text-slate-600">加载中...</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">城市</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">区县</span>
          <input
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm ${role === "service" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
          onClick={() => void saveRole("service")}
        >
          服务方
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm ${role === "resource" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
          onClick={() => void saveRole("resource")}
        >
          资源方
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm ${role === "both" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
          onClick={() => void saveRole("both")}
        >
          双角色
        </button>
      </div>

      <button
        type="button"
        onClick={() => void saveInfo()}
        className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        保存资料
      </button>

      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
    </section>
  );
}
