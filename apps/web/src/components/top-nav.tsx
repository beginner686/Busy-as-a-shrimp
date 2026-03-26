"use client";

import Link from "next/link";
import { useAuth } from "../auth/auth-context";

export function TopNav() {
  const { auth, openAuthModal, clearAuthSession } = useAuth();

  return (
    <nav className="top-nav glass-card">
      <Link href="/" className="nav-link">
        首页
      </Link>
      <button className="nav-link nav-action" type="button" onClick={() => openAuthModal("login")}>
        {auth.token ? "切换账号" : "登录/注册"}
      </button>
      <Link href="/profile" className="nav-link">
        个人资料
      </Link>
      <Link href="/resource/new" className="nav-link">
        新建资源
      </Link>
      <Link href="/resource/list" className="nav-link">
        资源列表
      </Link>
      <Link href="/match/list" className="nav-link">
        匹配列表
      </Link>
      {auth.token ? (
        <button className="nav-link nav-action" type="button" onClick={clearAuthSession}>
          退出
        </button>
      ) : null}
    </nav>
  );
}
