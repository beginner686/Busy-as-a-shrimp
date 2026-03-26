"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getUserApi } from "../../src/api";
import { ErrorState } from "../../src/components/error-state";
import { getErrorMessage } from "../../src/utils/error-message";

type Role = "service" | "resource" | "both";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [role, setRole] = useState<Role>("both");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getUserApi().getInfo();
        if (!active) {
          return;
        }
        setUserId(result.userId);
        setCity(result.city ?? "");
        setRole(result.role as Role);
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
    void load();
    return () => {
      active = false;
    };
  }, []);

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

  async function saveRole() {
    setMessage("");
    setError("");
    try {
      await getUserApi().updateRole({ role });
      setMessage("角色已切换");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  }

  return (
    <motion.main
      className="page glass-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <h1 className="title">个人资料</h1>
      <p className="subtitle">角色切换 + 资料维护（/user/info + /user/role）。</p>

      {loading ? <p className="small">加载中...</p> : null}
      {error ? <ErrorState title="资料读取失败" text={error} /> : null}

      {!loading ? (
        <div className="grid grid-2">
          <section className="glass-card item">
            <h3 className="state-title">基础信息</h3>
            <p className="small">userId: {userId ?? "-"}</p>
            <label className="field">
              <span className="label">城市</span>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">区县</span>
              <input
                className="input"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </label>
            <div className="button-row">
              <button className="btn btn-primary" type="button" onClick={saveInfo}>
                保存资料
              </button>
            </div>
          </section>

          <section className="glass-card item">
            <h3 className="state-title">角色切换</h3>
            <label className="field">
              <span className="label">当前角色</span>
              <select
                className="select"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="service">服务方</option>
                <option value="resource">资源方</option>
                <option value="both">双角色</option>
              </select>
            </label>
            <div className="button-row">
              <button className="btn btn-secondary" type="button" onClick={saveRole}>
                更新角色
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {message ? (
        <p className="small" style={{ marginTop: 12 }}>
          {message}
        </p>
      ) : null}
    </motion.main>
  );
}
