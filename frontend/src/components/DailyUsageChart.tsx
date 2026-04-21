import React, { useEffect, useRef, useState } from "react";
import type { Theme } from "../types";
import type { ThemeColors } from "../hooks/useTheme";

export default function DailyUsageChart({
  data,
  theme,
  colors
}: {
  data: Array<{ date: string; sessions: number; turns: number }>;
  theme: Theme;
  colors: ThemeColors;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const sparkHeight = 160;
  const pad = 32;
  const maxDaily = Math.max(1, ...data.map((d) => Math.max(d.sessions, d.turns)));
  const sparkWidth = Math.max(320, width);

  const pointsSessions = data
    .map((d, i) => {
      const x = pad + (i / (data.length - 1 || 1)) * (sparkWidth - pad * 2);
      const y = sparkHeight - pad - (d.sessions / maxDaily) * (sparkHeight - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const pointsTurns = data
    .map((d, i) => {
      const x = pad + (i / (data.length - 1 || 1)) * (sparkWidth - pad * 2);
      const y = sparkHeight - pad - (d.turns / maxDaily) * (sparkHeight - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <svg width={sparkWidth} height={sparkHeight} style={{ display: "block" }}>
        {[0, 1, 2, 3].map((i) => {
          const y = pad + (i / 3) * (sparkHeight - pad * 2);
          return <line key={i} x1={pad} y1={y} x2={sparkWidth - pad} y2={y} stroke={theme === "dark" ? "#27272a" : "#e5e7eb"} strokeDasharray="2 2" />;
        })}
        {[0, 1, 2, 3].map((i) => {
          const y = sparkHeight - pad - (i / 3) * (sparkHeight - pad * 2);
          const val = Math.round((maxDaily * i) / 3);
          return (
            <text key={`y-${i}`} x={pad - 8} y={y + 4} textAnchor="end" fontSize={10} fill={colors.textMuted}>
              {val}
            </text>
          );
        })}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 6));
          if (i % step !== 0 && i !== data.length - 1) return null;
          const x = pad + (i / (data.length - 1 || 1)) * (sparkWidth - pad * 2);
          const label = d.date.slice(5);
          return (
            <text key={`x-${i}`} x={x} y={sparkHeight - 6} textAnchor="middle" fontSize={10} fill={colors.textMuted}>
              {label}
            </text>
          );
        })}
        <line x1={pad} y1={pad} x2={pad} y2={sparkHeight - pad} stroke={theme === "dark" ? "#3f3f46" : "#d1d5db"} strokeWidth={1} />
        <line x1={pad} y1={sparkHeight - pad} x2={sparkWidth - pad} y2={sparkHeight - pad} stroke={theme === "dark" ? "#3f3f46" : "#d1d5db"} strokeWidth={1} />
        <polyline fill="none" stroke="#3b82f6" strokeWidth={2} points={pointsSessions} />
        <polyline fill="none" stroke="#22c55e" strokeWidth={2} points={pointsTurns} strokeDasharray="4 2" />
        {data.map((d, i) => {
          const x = pad + (i / (data.length - 1 || 1)) * (sparkWidth - pad * 2);
          const yS = sparkHeight - pad - (d.sessions / maxDaily) * (sparkHeight - pad * 2);
          const yT = sparkHeight - pad - (d.turns / maxDaily) * (sparkHeight - pad * 2);
          const handleMove = (e: React.MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setHover({ index: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
          };
          return (
            <g key={i}>
              <circle cx={x} cy={yS} r={3} fill="#3b82f6" />
              <circle cx={x} cy={yT} r={3} fill="#22c55e" />
              <rect
                x={x - (sparkWidth - pad * 2) / (data.length - 1 || 1) / 2}
                y={pad}
                width={(sparkWidth - pad * 2) / (data.length - 1 || 1)}
                height={sparkHeight - pad * 2}
                fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={(e) => handleMove(e)}
                onMouseMove={handleMove}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {hover && data[hover.index] ? (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(hover.x + 12, 8), width - 140),
            top: hover.y - 8,
            background: theme === "dark" ? "rgba(20,20,20,0.95)" : "rgba(255,255,255,0.95)",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            color: colors.text,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            zIndex: 10,
            minWidth: 120
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{data[hover.index].date}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
            <span style={{ color: colors.textMuted }}>Sessions:</span>
            <span style={{ fontWeight: 600, marginLeft: "auto" }}>{data[hover.index].sessions}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ color: colors.textMuted }}>Turns:</span>
            <span style={{ fontWeight: 600, marginLeft: "auto" }}>{data[hover.index].turns}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
