import { useEffect, useState } from "react";
import type { Theme } from "../types";

export type ThemeColors = typeof COLORS.light;

export const COLORS = {
  light: {
    bg: "#f3f4f6",
    surface: "#ffffff",
    surfaceElevated: "#ffffff",
    border: "#e5e7eb",
    text: "#0f172a",
    textSecondary: "#4b5563",
    textMuted: "#6b7280",
    headerBg: "#f8fafc",
    tableBorder: "#f0f0f0",
    selectedRow: "#eff6ff",
    inputBg: "#fff",
    inputBorder: "#d1d5db",
    btnPrimaryBg: "#2563eb",
    btnPrimaryBorder: "#1d4ed8",
    btnPrimaryText: "#fff",
    btnGhostBg: "#fff",
    btnGhostBorder: "#d1d5db",
    btnGhostText: "#111827",
    codeBg: "#f8fafc",
    jsonBg: "#0b1020",
    jsonText: "#e5e7eb",
    toneGoodBg: "#ecfdf5",
    toneGoodText: "#065f46",
    toneWarnBg: "#fef2f2",
    toneWarnText: "#991b1b",
    toneNeutralBg: "#f8fafc",
    toneNeutralText: "#0f172a",
    timelineBorder: "#f1f5f9",
    overlayBackdrop: "rgba(15, 23, 42, 0.35)",
    sidebarBg: "#f8fafc",
    sidebarBorder: "#e5e7eb",
    sidebarText: "#0f172a",
    sidebarTextMuted: "#6b7280",
    sidebarTextSecondary: "#4b5563",
    sidebarInputBg: "#ffffff",
    sidebarInputBorder: "#d1d5db",
    sidebarActiveBg: "rgba(59,130,246,0.1)",
    sidebarActiveBorder: "#2563eb",
    sidebarIndicator: "#22c55e",
    sidebarIndicatorInactive: "#9ca3af",
    sidebarBtnBg: "rgba(0,0,0,0.04)",
    sidebarBtnBorder: "#e5e7eb",
    sidebarBtnText: "#374151",
    sidebarHeaderMuted: "#6b7280"
  },
  dark: {
    bg: "#0a0a0a",
    surface: "#111111",
    surfaceElevated: "#141414",
    border: "#1f1f1f",
    text: "#e5e5e5",
    textSecondary: "#a1a1aa",
    textMuted: "#71717a",
    headerBg: "#141414",
    tableBorder: "#1f1f1f",
    selectedRow: "rgba(59, 130, 246, 0.15)",
    inputBg: "#141414",
    inputBorder: "#27272a",
    btnPrimaryBg: "#3b82f6",
    btnPrimaryBorder: "#2563eb",
    btnPrimaryText: "#fff",
    btnGhostBg: "#141414",
    btnGhostBorder: "#27272a",
    btnGhostText: "#e4e4e7",
    codeBg: "#141414",
    jsonBg: "#0b0b0b",
    jsonText: "#d4d4d8",
    toneGoodBg: "rgba(34, 197, 94, 0.15)",
    toneGoodText: "#4ade80",
    toneWarnBg: "rgba(239, 68, 68, 0.15)",
    toneWarnText: "#f87171",
    toneNeutralBg: "rgba(255,255,255,0.06)",
    toneNeutralText: "#e5e5e5",
    timelineBorder: "#1f1f1f",
    overlayBackdrop: "rgba(0, 0, 0, 0.6)",
    sidebarBg: "#0f0f0f",
    sidebarBorder: "#1f1f1f",
    sidebarText: "#e5e5e5",
    sidebarTextMuted: "#9ca3af",
    sidebarTextSecondary: "#d1d5db",
    sidebarInputBg: "rgba(255,255,255,0.06)",
    sidebarInputBorder: "rgba(255,255,255,0.08)",
    sidebarActiveBg: "rgba(255,255,255,0.08)",
    sidebarActiveBorder: "#ffffff",
    sidebarIndicator: "#4ade80",
    sidebarIndicatorInactive: "#6b7280",
    sidebarBtnBg: "rgba(255,255,255,0.04)",
    sidebarBtnBorder: "rgba(255,255,255,0.08)",
    sidebarBtnText: "#d1d5db",
    sidebarHeaderMuted: "#6b7280"
  }
};

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("kcm-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return "light";
  });

  useEffect(() => {
    try {
      localStorage.setItem("kcm-theme", theme);
    } catch {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  return [theme, toggle];
}
