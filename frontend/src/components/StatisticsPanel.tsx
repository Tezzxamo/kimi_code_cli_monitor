import React from "react";
import type { Theme, StatisticsResponse } from "../types";
import { COLORS } from "../hooks/useTheme";
import type { ThemeColors } from "../hooks/useTheme";
import DailyUsageChart from "./DailyUsageChart";
import StatCard from "./StatCard";

export default function StatisticsPanel({ statistics, theme }: { statistics: StatisticsResponse | null; theme: Theme }) {
  const c = COLORS[theme];

  if (!statistics) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: c.textMuted }}>
        加载统计中…
      </div>
    );
  }

  const fmtNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return `${n}`;
  };
  const fmtHours = (ms: number) => `${(ms / 3600000).toFixed(1)}h`;

  const panelStyle: React.CSSProperties = {
    marginTop: 14,
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: 12,
    color: c.text
  };

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 4 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard theme={theme} title="Total Sessions" value={String(statistics.total_sessions)} mono />
        <StatCard theme={theme} title="Total Turns" value={fmtNum(statistics.total_turns)} mono />
        <StatCard theme={theme} title="Total Tokens" value={fmtNum(statistics.total_tokens)} mono />
        <StatCard theme={theme} title="Total Duration" value={fmtHours(statistics.total_duration_ms)} mono />
      </div>

      <div style={{ ...panelStyle, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: c.text }}>Daily Usage (Last 30 Days)</div>
        <DailyUsageChart data={statistics.daily_usage} theme={theme} colors={c} />
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: c.textSecondary }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 3, background: "#3b82f6", borderRadius: 2 }} />
            <span>Sessions</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 3, background: "#22c55e", borderRadius: 2 }} />
            <span>Turns</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ ...panelStyle }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: c.text }}>Tool Usage (Top 20)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {statistics.tool_usage.map((t) => {
              const maxCalls = Math.max(1, statistics.tool_usage[0]?.calls || 1);
              const successWidth = (t.calls / maxCalls) * 100;
              return (
                <div key={t.tool} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 140, fontSize: 12, color: c.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tool}</div>
                  <div style={{ flex: 1, height: 10, background: theme === "dark" ? "#1f1f1f" : "#f1f5f9", borderRadius: 5, overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${successWidth}%`, background: "#3b82f6", borderRadius: 5 }} />
                    {t.errors > 0 ? (
                      <div
                        style={{
                          position: "absolute",
                          left: `${Math.min(successWidth, 100)}%`,
                          top: 0,
                          height: "100%",
                          width: `${Math.max(0, Math.min(100 - successWidth, (t.errors / maxCalls) * 100))}%`,
                          background: "#ef4444",
                          borderRadius: 5
                        }}
                      />
                    ) : null}
                  </div>
                  <div style={{ width: 80, fontSize: 12, color: c.text, textAlign: "right", fontFamily: "Consolas, Menlo, monospace" }}>
                    {t.calls} <span style={{ color: "#ef4444" }}>({t.errors})</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: c.textSecondary }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
              <span>Success</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
              <span>Error</span>
            </div>
          </div>
        </div>

        <div style={{ ...panelStyle }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: c.text }}>Top Projects</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", fontSize: 12, color: c.textMuted, padding: "6px 0", borderBottom: `1px solid ${c.border}` }}>
              <div style={{ flex: 1 }}>Project</div>
              <div style={{ width: 70, textAlign: "right" }}>Sessions</div>
              <div style={{ width: 60, textAlign: "right" }}>Turns</div>
            </div>
            {statistics.top_projects.map((p) => (
              <div key={p.work_dir} style={{ display: "flex", fontSize: 13, color: c.text, padding: "6px 0", borderBottom: `1px solid ${theme === "dark" ? "#1f1f1f" : "#f0f0f0"}` }}>
                <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.work_dir}</div>
                <div style={{ width: 70, textAlign: "right", fontFamily: "Consolas, Menlo, monospace" }}>{p.sessions}</div>
                <div style={{ width: 60, textAlign: "right", fontFamily: "Consolas, Menlo, monospace" }}>{p.turns}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
