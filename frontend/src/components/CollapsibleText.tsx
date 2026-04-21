import React, { useState } from "react";
import type { Theme } from "../types";
import type { ThemeColors } from "../hooks/useTheme";

export default function CollapsibleText({ text, theme, colors }: { text: string; theme: Theme; colors: ThemeColors }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n");
  const needsCollapse = lines.length > 3;
  const display = expanded ? text : lines.slice(0, 3).join("\n");
  return (
    <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc", padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
      <span style={{ color: colors.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{display}</span>
      {needsCollapse ? (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          style={{
            marginLeft: 8,
            fontSize: 12,
            color: colors.textMuted,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0
          }}
        >
          {expanded ? "收起" : "展开"}
        </button>
      ) : null}
    </div>
  );
}
