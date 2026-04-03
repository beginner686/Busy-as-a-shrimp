"use client";

import React, { useEffect, useState } from "react";
import { AdminNav } from "../AdminNav";

interface BountyTask {
  taskId: number;
  title: string;
  points: number;
  status: string;
  difficulty: string;
}

interface Submission {
  submissionId: number;
  userId: number;
  taskId: number;
  proof: string;
  status: string;
  createdAt: string;
}

export default function TasksAdminPage() {
  const [tasks, setTasks] = useState<BountyTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("../../src/api").then(({ getAdminApi }) => {
      Promise.all([getAdminApi().tasks(), getAdminApi().submissions()])
        .then(([tasksData, submissionsData]) => {
          setTasks(tasksData);
          setSubmissions(submissionsData);
        })
        .catch((err) => console.error("加载任务或提交失败", err))
        .finally(() => setLoading(false));
    });
  }, []);

  async function handleReview(id: number, decision: "approve" | "reject") {
    try {
      const { getAdminApi } = await import("../../src/api");
      await getAdminApi().reviewSubmission(id, decision);
      setSubmissions((prev) => prev.filter((sub) => sub.submissionId !== id));
    } catch (err) {
      console.error("审核失败", err);
    }
  }

  return (
    <div style={{ background: "#0a0c10", minHeight: "100vh", color: "#fff" }}>
      <AdminNav />
      <main style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        <header
          style={{
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                background: "linear-gradient(90deg, #fff, #5b8cff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              悬赏任务管理
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>
              管理、发布悬赏任务，并审核用户提交的任务证明。
            </p>
          </div>
          <button
            style={{
              background: "#5b8cff",
              border: "none",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            发布新任务
          </button>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px" }}>
          {/* 任务列表 */}
          <section>
            <h2 style={{ fontSize: "18px", marginBottom: "15px", color: "rgba(255,255,255,0.8)" }}>
              现有任务
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tasks.map((task) => (
                <div
                  key={task.taskId}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    padding: "15px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.08)"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start"
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>{task.title}</div>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: "rgba(91,140,255,0.15)",
                        color: "#5b8cff",
                        border: "1px solid rgba(91,140,255,0.3)"
                      }}
                    >
                      {task.difficulty}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#00e5a0" }}>奖励: {task.points} 积分</div>
                </div>
              ))}
            </div>
          </section>

          {/* 待审核提交 */}
          <section>
            <h2 style={{ fontSize: "18px", marginBottom: "15px", color: "rgba(255,255,255,0.8)" }}>
              待审核证明
            </h2>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.05)", textAlign: "left" }}>
                    <th style={{ padding: "12px 15px" }}>提交者 ID</th>
                    <th style={{ padding: "12px 15px" }}>任务</th>
                    <th style={{ padding: "12px 15px" }}>证明内容</th>
                    <th style={{ padding: "12px 15px" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "20px", textAlign: "center" }}>
                        加载中...
                      </td>
                    </tr>
                  ) : (
                    submissions.map((sub) => (
                      <tr
                        key={sub.submissionId}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <td style={{ padding: "12px 15px" }}>{sub.userId}</td>
                        <td style={{ padding: "12px 15px" }}>taskId: {sub.taskId}</td>
                        <td
                          style={{
                            padding: "12px 15px",
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.6)"
                          }}
                        >
                          {sub.proof}
                        </td>
                        <td style={{ padding: "12px 15px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => void handleReview(sub.submissionId, "approve")}
                              style={{
                                background: "#00e5a0",
                                border: "none",
                                color: "#000",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                cursor: "pointer"
                              }}
                            >
                              通过
                            </button>
                            <button
                              onClick={() => void handleReview(sub.submissionId, "reject")}
                              style={{
                                background: "rgba(255,77,109,0.2)",
                                border: "1px solid rgba(255,77,109,0.5)",
                                color: "#ff4d6d",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                cursor: "pointer"
                              }}
                            >
                              拒绝
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
