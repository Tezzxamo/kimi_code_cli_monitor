import React from "react";
import type { Theme } from "../types";

export default function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const isLight = theme === "light";
  return (
    <button
      onClick={onToggle}
      title={isLight ? "切换深色模式" : "切换浅色模式"}
      style={{
        width: 34,
        height: 30,
        borderRadius: 8,
        border: `1px solid ${isLight ? "#d1d5db" : "rgba(255,255,255,0.08)"}`,
        background: isLight ? "#ffffff" : "rgba(255,255,255,0.04)",
        color: isLight ? "#374151" : "#e5e5e5",
        fontSize: 16,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {isLight ? "🌙" : "☀️"}
    </button>
  );
}
