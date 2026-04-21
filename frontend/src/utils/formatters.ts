import type { Theme } from "../types";
import { COLORS } from "../hooks/useTheme";

export function formatUnixSeconds(v?: number | null): string {
  if (!v) return "-";
  const d = new Date(v * 1000);
  return d.toLocaleString();
}

export function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function formatEventTreeValue(v: unknown): string {
  if (typeof v === "string") return v.length > 300 ? `${v.slice(0, 300)}...` : v;
  if (v === null || v === undefined) return String(v);
  if (typeof v !== "object") return String(v);
  if (Array.isArray(v)) return `[${v.length}]`;
  return `{${Object.keys(v).length}}`;
}

export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function getEventDisplayTime(msg: { type: string; time: string; event?: Record<string, unknown> }): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(
      d.getHours()
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  if (msg.type === "meta") {
    return fmt(new Date(msg.time));
  }
  const evt = msg.event;
  if (!evt) return fmt(new Date(msg.time));
  const msgObj = evt.message as Record<string, unknown> | undefined;
  const payloadObj = msgObj?.payload as Record<string, unknown> | undefined;
  const candidates = [
    msgObj?.timestamp,
    payloadObj?.timestamp,
    evt.timestamp,
    msgObj?.time,
    payloadObj?.time,
    evt.time
  ];
  for (const ts of candidates) {
    if (ts !== undefined && ts !== null) {
      const num = Number(ts);
      if (!isNaN(num) && isFinite(num)) {
        const ms = num > 1e12 ? num : num * 1000;
        return fmt(new Date(ms));
      }
    }
  }
  return fmt(new Date(msg.time));
}

export function chipColorByKind(kind: string, theme: Theme): { bg: string; fg: string } {
  const k = kind.toLowerCase();
  if (k.includes("error") || k.includes("fail")) {
    return theme === "dark"
      ? { bg: "rgba(239, 68, 68, 0.15)", fg: "#f87171" }
      : { bg: "#fee2e2", fg: "#991b1b" };
  }
  if (k.includes("tool")) {
    return theme === "dark"
      ? { bg: "rgba(59, 130, 246, 0.15)", fg: "#60a5fa" }
      : { bg: "#dbeafe", fg: "#1e3a8a" };
  }
  if (k.includes("meta")) {
    return theme === "dark"
      ? { bg: "rgba(255,255,255,0.08)", fg: "#d4d4d8" }
      : { bg: "#e5e7eb", fg: "#374151" };
  }
  return theme === "dark"
    ? { bg: "rgba(139, 92, 246, 0.15)", fg: "#a78bfa" }
    : { bg: "#eef2ff", fg: "#3730a3" };
}

export function statusTone(status: string): "good" | "warn" | "neutral" {
  if (status.includes("异常")) return "warn";
  if (status.includes("已连接")) return "good";
  return "neutral";
}
