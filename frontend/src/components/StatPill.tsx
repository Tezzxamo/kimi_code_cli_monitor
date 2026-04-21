import React from "react";
import type { Theme } from "../types";
import { COLORS } from "../hooks/useTheme";

export default function StatPill(props: { title: string; value: string; tone?: "good" | "warn" | "neutral"; theme: Theme }) {
  const c = COLORS[props.theme];
  const toneStyle =
    props.tone === "good"
      ? { background: c.toneGoodBg, color: c.toneGoodText, borderColor: props.theme === "dark" ? "rgba(34,197,94,0.3)" : "#a7f3d0" }
      : props.tone === "warn"
        ? { background: c.toneWarnBg, color: c.toneWarnText, borderColor: props.theme === "dark" ? "rgba(239,68,68,0.3)" : "#fecaca" }
        : { background: c.toneNeutralBg, color: c.toneNeutralText, borderColor: props.theme === "dark" ? "rgba(255,255,255,0.1)" : "#e2e8f0" };
  return (
    <div style={{ ...statPillStyle, ...toneStyle }}>
      <span style={{ opacity: 0.8 }}>{props.title}</span>
      <span style={{ fontWeight: 700 }}>{props.value}</span>
    </div>
  );
}

const statPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12
};
