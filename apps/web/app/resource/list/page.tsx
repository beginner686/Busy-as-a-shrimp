"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getResourceApi } from "../../../src/api";
import { EmptyState } from "../../../src/components/empty-state";
import { ErrorState } from "../../../src/components/error-state";
import { getErrorMessage } from "../../../src/utils/error-message";

interface ResourceItem {
  resourceId: number;
  resourceType: string;
  tags: string[];
  status: string;
}

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeTextList(item));
  }

  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }

  if (typeof value === "number") {
    return [String(value)];
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => normalizeTextList(item));
  }

  return [];
}

function normalizeResourceList(value: unknown): ResourceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const row = item as Record<string, unknown>;
    const parsedId = Number(row.resourceId);

    return {
      resourceId: Number.isFinite(parsedId) ? parsedId : index + 1,
      resourceType: typeof row.resourceType === "string" ? row.resourceType : "unknown",
      tags: normalizeTextList(row.tags),
      status: typeof row.status === "string" ? row.status : "unknown"
    };
  });
}

export default function ResourceListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [items, setItems] = useState<ResourceItem[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [resourceList, resourceTags] = await Promise.all([
          getResourceApi().list(),
          getResourceApi().tags()
        ]);
        if (!active) {
          return;
        }
        setItems(normalizeResourceList(resourceList));
        setTags(normalizeTextList(resourceTags));
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

  return (
    <motion.main
      className="page glass-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <h1 className="title">资源列表</h1>
      <p className="subtitle">已接入 /resource/list 与 /resource/tags。</p>
      <p className="small">标签维度：{tags.join(" / ") || "-"}</p>

      {loading ? <p className="small">加载中...</p> : null}
      {error ? <ErrorState title="资源加载失败" text={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="暂无资源" text="当前没有可展示的资源记录。" />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <section className="list" style={{ marginTop: 14 }}>
          {items.map((item) => (
            <motion.article
              key={item.resourceId}
              className="glass-card item"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="item-head">
                <h3 className="state-title">资源 #{item.resourceId}</h3>
                <span className="badge">{item.status}</span>
              </div>
              <p className="small">类型：{item.resourceType}</p>
              <p className="small">标签：{item.tags.length ? item.tags.join(" / ") : "-"}</p>
            </motion.article>
          ))}
        </section>
      ) : null}
    </motion.main>
  );
}
