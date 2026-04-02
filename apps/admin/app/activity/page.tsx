"use client";

import React, { useEffect, useState } from "react";
import { AdminNav } from "../AdminNav";

interface RankingItem {
  rank: number;
  userId: number;
  inviteCount: number;
  maskedPhone: string;
}

export default function ActivityPage() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mocking API call for demonstration. In real world, use fetch to /activity/ranking
    setTimeout(() => {
      setRanking([
        { rank: 1, userId: 101, inviteCount: 45, maskedPhone: "138****8888" },
        { rank: 2, userId: 105, inviteCount: 38, maskedPhone: "159****6666" },
        { rank: 3, userId: 110, inviteCount: 32, maskedPhone: "133****1234" },
        { rank: 4, userId: 102, inviteCount: 28, maskedPhone: "188****5555" },
        { rank: 5, userId: 120, inviteCount: 25, maskedPhone: "177****9999" }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div style={{ background: "#0a0c10", minHeight: "100vh", color: "#fff" }}>
      <AdminNav />
      <main style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        <header style={{ marginBottom: "30px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              background: "linear-gradient(90deg, #fff, #5b8cff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            拉新活动实时监控
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>
            周期：2026-03-30 ~ 2026-04-13 | 奖池：¥5000 | 实时前 30 名排行
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            marginBottom: "40px"
          }}
        >
          <div className="stat-card">
            <label>累计邀请人数</label>
            <div className="value">1,248</div>
          </div>
          <div className="stat-card">
            <label>当前参与人数</label>
            <div className="value">842</div>
          </div>
          <div className="stat-card">
            <label>预计发放积分</label>
            <div className="value">5,000</div>
          </div>
        </section>

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
                <th style={{ padding: "15px 20px" }}>排名</th>
                <th style={{ padding: "15px 20px" }}>用户 ID</th>
                <th style={{ padding: "15px 20px" }}>手机号</th>
                <th style={{ padding: "15px 20px" }}>拉新数</th>
                <th style={{ padding: "15px 20px" }}>预计奖励</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "40px", textAlign: "center" }}>
                    加载中...
                  </td>
                </tr>
              ) : (
                ranking.map((item) => (
                  <tr
                    key={item.userId}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <td style={{ padding: "15px 20px" }}>
                      <span
                        style={{
                          color: item.rank <= 3 ? "#ffae00" : "#fff",
                          fontWeight: item.rank <= 3 ? 800 : 400
                        }}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td style={{ padding: "15px 20px" }}>{item.userId}</td>
                    <td style={{ padding: "15px 20px" }}>{item.maskedPhone}</td>
                    <td style={{ padding: "15px 20px" }}>{item.inviteCount}</td>
                    <td style={{ padding: "15px 20px", color: "#00e5a0" }}>
                      ¥
                      {item.rank === 1
                        ? 1000
                        : item.rank === 2
                          ? 600
                          : item.rank === 3
                            ? 400
                            : item.rank <= 10
                              ? 200
                              : 80}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <style jsx>{`
        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .stat-card label {
          display: block;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          margin-bottom: 8px;
        }
        .stat-card .value {
          font-size: 32px;
          font-weight: 700;
          font-family: "JetBrains Mono", monospace;
        }
      `}</style>
    </div>
  );
}
