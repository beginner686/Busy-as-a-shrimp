"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { getUserApi } from "../api";
import { useAuth } from "../auth/auth-context";
import { getErrorMessage } from "../utils/error-message";
import { ErrorState } from "./error-state";

export function AuthModal() {
  const { auth, mode, isAuthModalOpen, closeAuthModal, openAuthModal, setAuthSession } = useAuth();
  const [phone, setPhone] = useState("13800000000");
  const [verifyCode, setVerifyCode] = useState("1234");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isAuthModalOpen) {
      setSubmitting(false);
      setError("");
      setMessage("");
    }
  }, [isAuthModalOpen]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        await getUserApi().register({ phone, verifyCode });
        setMessage("注册成功，请继续登录。");
        openAuthModal("login");
      } else {
        const result = await getUserApi().login({ phone, verifyCode });
        setAuthSession({
          token: result.token,
          loginType: result.loginType,
          phone
        });
        setMessage("登录成功");
        closeAuthModal();
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: "login" | "register") {
    if (submitting) {
      return;
    }
    setError("");
    setMessage("");
    openAuthModal(nextMode);
  }

  return (
    <AnimatePresence>
      {isAuthModalOpen ? (
        <motion.div
          className="auth-modal-mask"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
        >
          <motion.section
            className="auth-modal glass-card"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="auth-modal-head">
              <h2 className="title auth-modal-title">{mode === "login" ? "登录" : "注册"}</h2>
              <button className="btn btn-secondary" type="button" onClick={closeAuthModal}>
                关闭
              </button>
            </header>

            <div className="auth-modal-tabs">
              <button
                className={`auth-tab${mode === "login" ? " auth-tab-active" : ""}`}
                type="button"
                onClick={() => switchMode("login")}
              >
                登录
              </button>
              <button
                className={`auth-tab${mode === "register" ? " auth-tab-active" : ""}`}
                type="button"
                onClick={() => switchMode("register")}
              >
                注册
              </button>
            </div>

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
                  {submitting ? "提交中..." : mode === "login" ? "立即登录" : "立即注册"}
                </button>
              </div>
            </form>

            {error ? (
              <ErrorState title={mode === "login" ? "登录失败" : "注册失败"} text={error} />
            ) : null}

            {message ? (
              <p className="small" style={{ marginTop: 10 }}>
                {message}
              </p>
            ) : null}

            {auth.token ? (
              <section className="glass-card item" style={{ marginTop: 12 }}>
                <h3 className="state-title">当前会话</h3>
                <p className="small">phone: {auth.phone}</p>
                <p className="small">loginType: {auth.loginType}</p>
              </section>
            ) : null}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
