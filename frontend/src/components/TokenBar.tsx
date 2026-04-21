import React from "react";

export default function TokenBar({ label, value, total, color, bg, labelColor }: { label: string; value: number; total: number; color: string; bg: string; labelColor: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 90, color: labelColor, fontSize: 11 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: bg, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span style={{ width: 50, textAlign: "right", fontFamily: "Consolas, Menlo, monospace", fontSize: 11 }}>{value}</span>
    </div>
  );
}
