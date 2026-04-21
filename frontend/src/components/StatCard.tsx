import React from "react";
import type { Theme } from "../types";
import { COLORS } from "../hooks/useTheme";
import type { ThemeColors } from "../hooks/useTheme";

export default function StatCard(props: { title: string; value: string; tone?: "good" | "warn" | "neutral"; mono?: boolean; theme: Theme }) {
  const c = COLORS[props.theme];
  const toneStyle =
    props.tone === "good"
      ? { background: c.toneGoodBg, color: c.toneGoodText }
      : props.tone === "warn"
        ? { background: c.toneWarnBg, color: c.toneWarnText }
        : { background: c.toneNeutralBg, color: c.toneNeutralText };
  return (
    <div style={{ ...statCardStyle(c), ...toneStyle }}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{props.title}</div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700, fontFamily: props.mono ? "Consolas, Menlo, monospace" : undefined }}>
        {props.value}
      </div>
    </div>
  );
}

function statCardStyle(c: ThemeColors): React.CSSProperties {
  return {
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    height: "100%",
    boxSizing: "border-box"
  };
}
