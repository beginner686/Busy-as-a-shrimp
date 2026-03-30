"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getAdminApi } from "@/api";
import type { AdminResource, ReviewDecision } from "@/api/admin-api";
import { getErrorMessage } from "@/utils/error-message";
import pageStyles from "../../page.module.css";

const RESOURCE_REVIEW_QUERY_KEY = ["admin", "resource-review", "pending"] as const;

const TYPE_LABEL: Record<string, string> = {
  skill: "技能",
  location: "场地",
  account: "账号",
  time: "时间"
};

const RISK_COLOR: Record<string, { color: string; bg: string }> = {
  价格区间异常: { color: "#fca5a5", bg: "rgba(239,68,68,0.1)" },
  标签包含联系方式: { color: "#fde68a", bg: "rgba(234,179,8,0.1)" },
  未发现风险: { color: "#6ee7b7", bg: "rgba(52,211,153,0.1)" }
};

function describePrice(resource: AdminResource): string {
  const min = resource.priceRange?.min;
  const max = resource.priceRange?.max;
  if (!Number.isFinite(min) && !Number.isFinite(max)) return "-";
  if (Number.isFinite(min) && Number.isFinite(max)) return `${min} - ${max}`;
  if (Number.isFinite(min)) return `≥ ${min}`;
  return `≤ ${max}`;
}

function getRiskSummary(resource: AdminResource): string {
  const price = resource.priceRange;
  const hasBadPrice =
    price &&
    Number.isFinite(price.min) &&
    Number.isFinite(price.max) &&
    ((price.min ?? 0) <= 0 || (price.max ?? 0) < (price.min ?? 0));
  if (hasBadPrice) return "价格区间异常";
  if (resource.tags.some((tag) => /wechat|vx|qq|@|1\d{10}/i.test(tag))) return "标签包含联系方式";
  return "未发现风险";
}

export default function ResourceReviewPage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const resourcesQuery = useQuery({
    queryKey: RESOURCE_REVIEW_QUERY_KEY,
    queryFn: async (): Promise<AdminResource[]> => {
      const items = await getAdminApi().resources();
      return items.filter((item) => item.status === "pending");
    },
    staleTime: 30_000
  });

  const reviewMutation = useMutation({
    mutationFn: ({ resourceId, decision }: { resourceId: number; decision: ReviewDecision }) =>
      getAdminApi().reviewResource(resourceId, decision),
    onSuccess: (result) => {
      setNotice(
        `资源 #${result.resourceId} 已${result.status === "active" ? "通过审核" : "被拒绝"}`
      );
      void queryClient.invalidateQueries({ queryKey: RESOURCE_REVIEW_QUERY_KEY });
    }
  });

  const resources = resourcesQuery.data || [];

  function handleReview(resourceId: number, decision: ReviewDecision) {
    reviewMutation.mutate({ resourceId, decision });
  }

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.headerRow}>
        <div>
          <h1 className={pageStyles.title}>资源审核</h1>
          <p className={pageStyles.subtitle}>处理待审核队列中的资源提交。</p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 16px",
            borderRadius: "999px",
            border: "1px solid rgba(130,148,255,0.4)",
            background: "rgba(99,102,241,0.15)",
            color: "#a5b4fc",
            fontSize: "13px",
            fontWeight: 600
          }}
        >
          待审：{resources.length}
        </span>
      </div>

      {notice ? (
        <p
          style={{
            marginBottom: "12px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#a5b4fc",
            fontSize: "13px"
          }}
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <section className={pageStyles.panel}>
        <div className={pageStyles.panelHeader}>
          <h2>待审资源列表</h2>
        </div>

        {resourcesQuery.isLoading ? (
          <p className={pageStyles.loading}>正在加载待审资源...</p>
        ) : null}

        {!resourcesQuery.isLoading && resourcesQuery.isError ? (
          <p className={pageStyles.error}>加载失败：{getErrorMessage(resourcesQuery.error)}</p>
        ) : null}

        {!resourcesQuery.isLoading && !resourcesQuery.isError && resources.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "32px 0", margin: 0 }}>
            暂无待审核的资源，队列已清空。🎉
          </p>
        ) : null}

        {!resourcesQuery.isLoading && !resourcesQuery.isError && resources.length > 0 ? (
          <div className={pageStyles.tableWrap}>
            <table className={pageStyles.table}>
              <thead>
                <tr>
                  <th>资源ID</th>
                  <th>提交者</th>
                  <th>类型</th>
                  <th>标签</th>
                  <th>价格区间</th>
                  <th>风险提示</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => {
                  const risk = getRiskSummary(resource);
                  const riskStyle = RISK_COLOR[risk] ?? RISK_COLOR["未发现风险"];
                  return (
                    <tr key={resource.resourceId}>
                      <td>#{resource.resourceId}</td>
                      <td>#{resource.userId}</td>
                      <td>{TYPE_LABEL[resource.resourceType] ?? resource.resourceType}</td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {resource.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                background: "rgba(99,102,241,0.12)",
                                border: "1px solid rgba(99,102,241,0.25)",
                                color: "#c7d2fe"
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {resource.tags.length === 0 && (
                            <span style={{ color: "#475569" }}>-</span>
                          )}
                        </div>
                      </td>
                      <td>{describePrice(resource)}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            background: riskStyle.bg,
                            color: riskStyle.color
                          }}
                        >
                          {risk}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => handleReview(resource.resourceId, "approve")}
                            style={{
                              padding: "4px 14px",
                              borderRadius: "8px",
                              border: "1px solid rgba(52,211,153,0.4)",
                              background: "rgba(52,211,153,0.1)",
                              color: "#6ee7b7",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit"
                            }}
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => handleReview(resource.resourceId, "reject")}
                            style={{
                              padding: "4px 14px",
                              borderRadius: "8px",
                              border: "1px solid rgba(248,113,113,0.4)",
                              background: "rgba(248,113,113,0.1)",
                              color: "#fca5a5",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit"
                            }}
                          >
                            拒绝
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
