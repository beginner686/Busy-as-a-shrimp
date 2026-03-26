"use client";

import imageCompression from "browser-image-compression";
import { motion } from "framer-motion";
import { FormEvent, useState } from "react";
import type { ResourceType } from "@airp/api-types";
import { getResourceApi } from "../../../src/api";
import { ErrorState } from "../../../src/components/error-state";
import { getErrorMessage } from "../../../src/utils/error-message";

export default function ResourceNewPage() {
  const [resourceType, setResourceType] = useState<ResourceType>("skill");
  const [tagsText, setTagsText] = useState("短视频,探店");
  const [areaCode, setAreaCode] = useState("310000");
  const [priceMin, setPriceMin] = useState("500");
  const [priceMax, setPriceMax] = useState("3000");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [compressionInfo, setCompressionInfo] = useState("");

  async function onImageSelect(file?: File | null) {
    if (!file) {
      setCompressionInfo("");
      return;
    }

    const compressed = await imageCompression(file, {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1280,
      useWebWorker: true
    });

    setCompressionInfo(
      `原图 ${(file.size / 1024).toFixed(1)}KB -> 压缩后 ${(compressed.size / 1024).toFixed(1)}KB`
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const tags = tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const min = Number(priceMin);
      const max = Number(priceMax);

      const result = await getResourceApi().upload({
        resourceType,
        tags,
        areaCode,
        priceRange: { min, max }
      });
      setMessage(`已提交，resourceId=${result.resourceId}，状态=${result.reviewStatus}`);
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
      <h1 className="title">上传资源</h1>
      <p className="subtitle">支持标签、地区、价格区间和图片压缩预处理。</p>

      <form className="grid" onSubmit={onSubmit}>
        <div className="grid grid-2">
          <label className="field">
            <span className="label">资源类型</span>
            <select
              className="select"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value as ResourceType)}
            >
              <option value="skill">技能</option>
              <option value="location">场地</option>
              <option value="account">账号</option>
              <option value="time">时间</option>
            </select>
          </label>
          <label className="field">
            <span className="label">地区编码</span>
            <input
              className="input"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="label">标签（英文逗号分隔）</span>
          <textarea
            className="textarea"
            rows={3}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </label>

        <div className="grid grid-2">
          <label className="field">
            <span className="label">最低价</span>
            <input
              className="input"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">最高价</span>
            <input
              className="input"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="label">图片（仅演示前端压缩）</span>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => void onImageSelect(e.target.files?.[0] ?? null)}
          />
        </label>

        {compressionInfo ? <p className="small">{compressionInfo}</p> : null}

        <div className="button-row">
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "提交中..." : "提交资源"}
          </button>
        </div>
      </form>

      {error ? <ErrorState title="上传失败" text={error} /> : null}
      {message ? (
        <p className="small" style={{ marginTop: 12 }}>
          {message}
        </p>
      ) : null}
    </motion.main>
  );
}
