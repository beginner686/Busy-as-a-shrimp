"use client";

import { motion } from "framer-motion";
import { FormEvent, useState } from "react";
import { getUserApi } from "../../src/api";
import { ErrorState } from "../../src/components/error-state";
import { getErrorMessage } from "../../src/utils/error-message";

export default function LoginPage() {
  const [phone, setPhone] = useState("13800000000");
  const [verifyCode, setVerifyCode] = useState("1234");
  const [token, setToken] = useState("");
  const [loginType, setLoginType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await getUserApi().login({ phone, verifyCode });
      setToken(result.token);
      setLoginType(result.loginType);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.main
      className="page glass-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <h1 className="title">手机号登录</h1>
      <p className="subtitle">当前阶段使用后端 mock 登录接口。</p>

      <form className="grid" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">手机号</span>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">验证码</span>
          <input
            className="input"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
          />
        </label>
        <div className="button-row">
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "提交中..." : "登录"}
          </button>
        </div>
      </form>

      {error ? <ErrorState title="登录失败" text={error} /> : null}

      {token ? (
        <section className="glass-card item" style={{ marginTop: 14 }}>
          <h3 className="state-title">登录结果</h3>
          <p className="small">token: {token}</p>
          <p className="small">loginType: {loginType}</p>
        </section>
      ) : null}
    </motion.main>
  );
}
