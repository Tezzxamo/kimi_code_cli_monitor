import React, { useEffect, useMemo, useRef, useState } from "react";

type Theme = "light" | "dark";

type SessionItem = {
  session_id: string;
  work_dir_hash: string;
  work_dir?: string | null;
  title?: string | null;
  session_dir?: string;
  wire_path?: string;
  created_at?: number | null;
  updated_at?: number | null;
};

type SessionsResponse = {
  share_dir: string;
  sessions: SessionItem[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

type StreamMessage =
  | { type: "meta"; time: string; session_id: string }
  | { type: "wire"; time: string; event: Record<string, unknown>; next_offset?: number };

type StatisticsResponse = {
  total_sessions: number;
  total_turns: number;
  total_tokens: number;
  total_duration_ms: number;
  daily_usage: Array<{ date: string; sessions: number; turns: number }>;
  tool_usage: Array<{ tool: string; calls: number; errors: number }>;
  top_projects: Array<{ work_dir: string; sessions: number; turns: number }>;
};

const TreeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M7 12h14" />
    <path d="M7 18h14" />
    <path d="M3 6v14" />
  </svg>
);

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const COLORS = {
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
    // Sidebar
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
    // Sidebar
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

function useTheme(): [Theme, () => void] {
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

function formatUnixSeconds(v?: number | null): string {
  if (!v) return "-";
  const d = new Date(v * 1000);
  return d.toLocaleString();
}

function getEventKind(msg: StreamMessage): string {
  if (msg.type !== "wire") return "meta";
  const evt = msg.event;
  const candidateKeys = ["type", "event", "kind", "name", "op"] as const;
  for (const k of candidateKeys) {
    const val = evt[k];
    if (typeof val === "string" && val.trim()) return val;
  }
  return "wire";
}

function getDetailedEventKind(msg: StreamMessage): string {
  if (msg.type !== "wire") return "meta";
  const evt = msg.event;
  const topType = typeof evt.type === "string" ? evt.type : "";
  const msgObj = (evt.message && typeof evt.message === "object" && evt.message !== null)
    ? (evt.message as Record<string, unknown>)
    : null;
  const msgType = msgObj?.type ?? "";
  const payloadObj = (msgObj?.payload && typeof msgObj.payload === "object" && msgObj.payload !== null)
    ? (msgObj.payload as Record<string, unknown>)
    : null;
  const payloadType = payloadObj?.type ?? "";

  if (msgType === "ContentPart") {
    if (payloadType === "text") return "TextPart";
    if (payloadType === "think") return "ThinkPart";
    if (payloadType === "tool_call") return "ToolCallPart";
    return "ContentPart";
  }
  if (typeof msgType === "string" && msgType) return msgType;
  if (typeof topType === "string" && topType) return topType;
  return "wire";
}

function eventHasError(evt: Record<string, unknown> | undefined): boolean {
  if (!evt) return false;
  const stack: unknown[] = [evt];
  while (stack.length) {
    const cur = stack.pop();
    if (cur && typeof cur === "object") {
      if (!Array.isArray(cur)) {
        if ((cur as Record<string, unknown>)["is_error"] === true) return true;
      }
      for (const v of Object.values(cur as Record<string, unknown> | unknown[])) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return false;
}

function formatEventTreeValue(v: unknown): string {
  if (typeof v === "string") return v.length > 300 ? `${v.slice(0, 300)}...` : v;
  if (v === null || v === undefined) return String(v);
  if (typeof v !== "object") return String(v);
  if (Array.isArray(v)) return `[${v.length}]`;
  return `{${Object.keys(v).length}}`;
}

function getSubagentInnerKind(evt: Record<string, unknown>): string | undefined {
  const parsed = parseWireEvent(evt);
  return asString(parsed.flat["message.payload.event.type"]);
}

function getSubagentInnerEvent(evt: Record<string, unknown>): Record<string, unknown> | undefined {
  const msgObj = (evt.message && typeof evt.message === "object" && evt.message !== null)
    ? (evt.message as Record<string, unknown>)
    : null;
  const payloadObj = (msgObj?.payload && typeof msgObj.payload === "object" && msgObj.payload !== null)
    ? (msgObj.payload as Record<string, unknown>)
    : null;
  const nestedEvent = payloadObj?.event;
  if (nestedEvent && typeof nestedEvent === "object" && !Array.isArray(nestedEvent)) {
    return nestedEvent as Record<string, unknown>;
  }
  return undefined;
}

function getStepBeginNumber(evt: Record<string, unknown> | undefined): number | undefined {
  if (!evt) return undefined;
  const parsed = parseWireEvent(evt);
  for (const key of ["message.payload.n", "payload.n"]) {
    const n = parsed.flat[key];
    if (typeof n === "number") return n;
    if (typeof n === "string") {
      const num = Number(n);
      if (!isNaN(num) && isFinite(num)) return num;
    }
  }
  return undefined;
}

function getThinkText(evt: Record<string, unknown> | undefined): string | undefined {
  if (!evt) return undefined;
  const parsed = parseWireEvent(evt);
  return asString(parsed.flat["message.payload.think"]) ?? asString(parsed.flat["payload.think"]);
}

function getTextPartText(evt: Record<string, unknown> | undefined): string | undefined {
  if (!evt) return undefined;
  const parsed = parseWireEvent(evt);
  return asString(parsed.flat["message.payload.text"]) ?? asString(parsed.flat["payload.text"]);
}

function getToolCallSummary(evt: Record<string, unknown> | undefined): { id?: string; name?: string } {
  if (!evt) return {};
  const parsed = parseWireEvent(evt);
  const id =
    asString(parsed.flat["message.payload.id"]) ||
    asString(parsed.flat["message.payload.tool_call_id"]) ||
    asString(parsed.flat["message.payload.task_tool_call_id"]) ||
    asString(parsed.flat["payload.id"]) ||
    asString(parsed.flat["payload.tool_call_id"]) ||
    asString(parsed.flat["payload.task_tool_call_id"]);
  const name =
    asString(parsed.flat["message.payload.function.name"]) ||
    asString(parsed.flat["message.payload.name"]) ||
    asString(parsed.flat["payload.function.name"]) ||
    asString(parsed.flat["payload.name"]);
  return { id, name };
}

function getErrorDetails(evt: Record<string, unknown> | undefined): { output?: string; message?: string } {
  if (!evt) return {};
  const stack: unknown[] = [evt];
  while (stack.length) {
    const cur = stack.pop();
    if (cur && typeof cur === "object" && !Array.isArray(cur)) {
      const obj = cur as Record<string, unknown>;
      if (obj["is_error"] === true) {
        return {
          output: typeof obj["output"] === "string" ? obj["output"] : undefined,
          message: typeof obj["message"] === "string" ? obj["message"] : undefined
        };
      }
      for (const v of Object.values(obj)) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return {};
}

function requestNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "default") {
    window.Notification.requestPermission();
  }
}

function maybeNotify(msg: StreamMessage) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  if (msg.type !== "wire") return;
  const kind = getDetailedEventKind(msg);
  const evt = msg.event;

  if (kind === "ApprovalRequest") {
    new window.Notification("Kimi CLI Monitor", { body: "收到新的操作确认请求" });
  } else if (kind === "ToolResult" && eventHasError(evt)) {
    new window.Notification("Kimi CLI Monitor", { body: "工具调用发生异常" });
  }
}

function getToolCallArgs(evt: Record<string, unknown> | undefined): string | undefined {
  if (!evt) return undefined;
  const parsed = parseWireEvent(evt);
  const args =
    asString(parsed.flat["message.payload.arguments"]) ??
    asString(parsed.flat["message.payload.function.arguments"]) ??
    asString(parsed.flat["payload.arguments"]) ??
    asString(parsed.flat["payload.function.arguments"]);
  if (!args) return undefined;
  try {
    const obj = JSON.parse(args);
    return JSON.stringify(obj, null, 2);
  } catch {
    return args.length > 300 ? args.slice(0, 300) + "..." : args;
  }
}

function getToolResultDetails(evt: Record<string, unknown> | undefined): { tool_call_id?: string; return_value?: string; is_error?: boolean } {
  if (!evt) return {};
  const parsed = parseWireEvent(evt);
  const id = asString(parsed.flat["message.payload.tool_call_id"]) ?? asString(parsed.flat["payload.tool_call_id"]);
  const isErr = parsed.flat["message.payload.is_error"] === true || parsed.flat["payload.is_error"] === true;
  const rv = parsed.flat["message.payload.return_value"] ?? parsed.flat["payload.return_value"];
  let rvStr: string | undefined;
  if (rv !== undefined) {
    rvStr = typeof rv === "string" ? rv : JSON.stringify(rv);
    if (rvStr.length > 500) rvStr = rvStr.slice(0, 500) + "...";
  }
  return { tool_call_id: id, return_value: rvStr, is_error: isErr };
}

function getApprovalRequestDetails(evt: Record<string, unknown> | undefined): { operation?: string; files?: string[] } {
  if (!evt) return {};
  const parsed = parseWireEvent(evt);
  const op = asString(parsed.flat["message.payload.operation"]) ?? asString(parsed.flat["payload.operation"]);
  const filesRaw = parsed.flat["message.payload.files"] ?? parsed.flat["payload.files"];
  let files: string[] = [];
  if (typeof filesRaw === "string") {
    files = filesRaw.split(", ").filter(Boolean);
  } else if (Array.isArray(filesRaw)) {
    files = filesRaw.map((f) => (typeof f === "string" ? f : "")).filter(Boolean);
  }
  return { operation: op, files };
}

function getTokenUsage(evt: Record<string, unknown> | undefined): { input_cache_read: number; input_cache_creation: number; input_other: number; output: number } | undefined {
  if (!evt) return undefined;
  const parsed = parseWireEvent(evt);
  const tu = parsed.flat["message.payload.token_usage"] ?? parsed.flat["payload.token_usage"];
  if (!tu || typeof tu !== "object") return undefined;
  const t = tu as Record<string, unknown>;
  return {
    input_cache_read: typeof t.input_cache_read === "number" ? t.input_cache_read : 0,
    input_cache_creation: typeof t.input_cache_creation === "number" ? t.input_cache_creation : 0,
    input_other: typeof t.input_other === "number" ? t.input_other : 0,
    output: typeof t.output === "number" ? t.output : 0,
  };
}

function EventTreeNode({
  label,
  data,
  depth,
  colors,
  defaultOpen = false,
  open: controlledOpen,
  onToggle
}: {
  label?: string;
  data: unknown;
  depth: number;
  colors: typeof COLORS.light;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (next: boolean) => void;
}): React.ReactElement {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onToggle?.(next);
  };
  const isObject = data !== null && typeof data === "object";
  const isArray = Array.isArray(data);

  if (!isObject) {
    return (
      <div style={{ paddingLeft: depth * 12, lineHeight: 1.5 }}>
        {label !== undefined ? (
          <>
            <span style={{ color: colors.textMuted }}>{label}: </span>
            <span style={{ color: colors.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{formatEventTreeValue(data)}</span>
          </>
        ) : (
          <span style={{ color: colors.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{formatEventTreeValue(data)}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: depth * 12, lineHeight: 1.5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={toggle}>
        <span style={{ color: colors.textMuted, fontSize: 12, userSelect: "none", width: 14, display: "inline-block" }}>{open ? "▼" : "▶"}</span>
        <span style={{ color: colors.textMuted }}>{label !== undefined ? `${label}: ` : null}</span>
      </div>
      {open ? (
        <div style={{ marginTop: 2 }}>
          {isArray
            ? (data as unknown[]).map((item, i) => (
                <EventTreeNode key={i} label={`[${i}]`} data={item} depth={depth + 1} colors={colors} />
              ))
            : Object.entries(data as Record<string, unknown>).map(([k, v]) => (
                <EventTreeNode key={k} label={k} data={v} depth={depth + 1} colors={colors} />
              ))}
        </div>
      ) : null}
    </div>
  );
}

function summarizeEvent(msg: StreamMessage): string {
  if (msg.type === "meta") return `session=${msg.session_id}`;
  const parsed = parseWireEvent(msg.event);
  const eventType = firstNonEmpty(
    asString(parsed.flat["message.type"]),
    asString(parsed.flat["message.event.type"]),
    asString(parsed.flat["message.payload.event.type"]),
    asString(parsed.flat["type"])
  );
  const toolCallId = firstNonEmpty(
    asString(parsed.flat["message.payload.task_tool_call_id"]),
    asString(parsed.flat["message.event.payload.tool_call_id"]),
    asString(parsed.flat["message.payload.event.payload.tool_call_id"])
  );
  const reqId = asString(parsed.flat["message.payload.request_id"]);
  const response = asString(parsed.flat["message.payload.response"]);

  if (eventType && toolCallId) return `${eventType} | tool_call_id=${toolCallId}`;
  if (eventType && reqId) return `${eventType} | request_id=${reqId}`;
  if (eventType && response) return `${eventType} | response=${response}`;
  if (eventType) return eventType;

  const fallback = firstNonEmpty(
    asString(parsed.flat["summary"]),
    asString(parsed.flat["message"]),
    asString(parsed.flat["id"])
  );
  return fallback || JSON.stringify(msg.event).slice(0, 140);
}

function extractEventFields(msg: StreamMessage): Array<{ key: string; value: string }> {
  if (msg.type === "meta") {
    return [
      { key: "type", value: "meta" },
      { key: "session_id", value: msg.session_id },
      { key: "time", value: msg.time }
    ];
  }

  const parsed = parseWireEvent(msg.event);
  const picks: Array<[string, string[]]> = [
    ["event_type", ["message.type", "message.event.type", "message.payload.event.type", "type"]],
    ["sub_event_type", ["message.payload.event.type", "message.event.type"]],
    ["tool_call_id", ["message.payload.task_tool_call_id", "message.event.payload.tool_call_id", "message.payload.event.payload.tool_call_id"]],
    ["request_id", ["message.payload.request_id"]],
    ["response", ["message.payload.response"]],
    ["timestamp", ["message.timestamp", "timestamp"]],
    ["status", ["message.status", "status"]],
    ["id", ["id", "message.id"]]
  ];

  const rows: Array<{ key: string; value: string }> = [];
  const usedPath = new Set<string>();

  for (const [label, paths] of picks) {
    const value = firstValueByPaths(parsed.flat, paths);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      rows.push({ key: label, value: stringifySmall(value) });
      const path = firstMatchedPath(parsed.flat, paths);
      if (path) usedPath.add(path);
    }
  }

  if (rows.length < 10) {
    const candidates = Object.entries(parsed.flat)
      .filter(([k, v]) => !usedPath.has(k) && v !== undefined && v !== null && typeof v !== "object")
      .sort(([a], [b]) => a.localeCompare(b));
    for (const [k, v] of candidates) {
      rows.push({ key: k, value: stringifySmall(v) });
      if (rows.length >= 10) break;
    }
  }

  return rows;
}

function parseWireEvent(raw: Record<string, unknown>): { normalized: Record<string, unknown>; flat: Record<string, unknown> } {
  const normalized = deepNormalize(raw, 0) as Record<string, unknown>;
  const flat: Record<string, unknown> = {};
  flattenObject(normalized, "", flat);
  return { normalized, flat };
}

function deepNormalize(input: unknown, depth: number): unknown {
  if (depth > 5) return input;
  if (typeof input === "string") {
    const parsed = tryParseJson(input);
    if (parsed !== undefined) return deepNormalize(parsed, depth + 1);
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((v) => deepNormalize(v, depth + 1));
  }
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = deepNormalize(v, depth + 1);
    }
    return out;
  }
  return input;
}

function tryParseJson(text: string): unknown | undefined {
  const t = text.trim();
  if (!t) return undefined;
  if (!(t.startsWith("{") || t.startsWith("["))) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
}

function flattenObject(input: unknown, prefix: string, out: Record<string, unknown>): void {
  if (input === null || input === undefined) return;
  if (typeof input !== "object") {
    if (prefix) out[prefix] = input;
    return;
  }
  if (Array.isArray(input)) {
    if (prefix) out[prefix] = input.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
    return;
  }
  const obj = input as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flattenObject(v, key, out);
    } else if (Array.isArray(v)) {
      out[key] = v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
    } else {
      out[key] = v;
    }
  }
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return typeof v === "string" ? v : String(v);
}

function firstNonEmpty(...vals: Array<string | undefined>): string | undefined {
  for (const v of vals) {
    if (v && v.trim()) return v;
  }
  return undefined;
}

function firstValueByPaths(map: Record<string, unknown>, paths: string[]): unknown {
  for (const p of paths) {
    const v = map[p];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

function firstMatchedPath(map: Record<string, unknown>, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = map[p];
    if (v !== undefined && v !== null && String(v).trim() !== "") return p;
  }
  return undefined;
}

function stringifySmall(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function getEventDisplayTime(msg: StreamMessage): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(
      d.getHours()
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  if (msg.type === "meta") {
    return fmt(new Date(msg.time));
  }
  const parsed = parseWireEvent(msg.event);
  const ts = firstValueByPaths(parsed.flat, [
    "message.timestamp",
    "message.payload.timestamp",
    "timestamp",
    "message.time",
    "message.payload.time",
    "time"
  ]);
  if (ts !== undefined && ts !== null) {
    const num = Number(ts);
    if (!isNaN(num) && isFinite(num)) {
      const ms = num > 1e12 ? num : num * 1000;
      return fmt(new Date(ms));
    }
  }
  return fmt(new Date(msg.time));
}

function chipColorByKind(kind: string, theme: Theme): { bg: string; fg: string } {
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

function renderTruncatedCode(text?: string | null, maxWidth = 260): React.ReactNode {
  const val = text || "-";
  return (
    <code
      title={val}
      style={{
        display: "inline-block",
        maxWidth,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        verticalAlign: "bottom"
      }}
    >
      {val}
    </code>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
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

function DailyUsageChart({
  data,
  theme,
  colors
}: {
  data: Array<{ date: string; sessions: number; turns: number }>;
  theme: Theme;
  colors: typeof COLORS.light;
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
        {/* Grid lines */}
        {[0, 1, 2, 3].map((i) => {
          const y = pad + (i / 3) * (sparkHeight - pad * 2);
          return <line key={i} x1={pad} y1={y} x2={sparkWidth - pad} y2={y} stroke={theme === "dark" ? "#27272a" : "#e5e7eb"} strokeDasharray="2 2" />;
        })}
        {/* Y-axis labels */}
        {[0, 1, 2, 3].map((i) => {
          const y = sparkHeight - pad - (i / 3) * (sparkHeight - pad * 2);
          const val = Math.round((maxDaily * i) / 3);
          return (
            <text key={`y-${i}`} x={pad - 8} y={y + 4} textAnchor="end" fontSize={10} fill={colors.textMuted}>
              {val}
            </text>
          );
        })}
        {/* X-axis labels */}
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
        {/* Axis lines */}
        <line x1={pad} y1={pad} x2={pad} y2={sparkHeight - pad} stroke={theme === "dark" ? "#3f3f46" : "#d1d5db"} strokeWidth={1} />
        <line x1={pad} y1={sparkHeight - pad} x2={sparkWidth - pad} y2={sparkHeight - pad} stroke={theme === "dark" ? "#3f3f46" : "#d1d5db"} strokeWidth={1} />
        {/* Data lines */}
        <polyline fill="none" stroke="#3b82f6" strokeWidth={2} points={pointsSessions} />
        <polyline fill="none" stroke="#22c55e" strokeWidth={2} points={pointsTurns} strokeDasharray="4 2" />
        {/* Invisible wide hover targets + visible circles */}
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
              {/* transparent wide hover line */}
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

function TokenBar({ label, value, total, color, bg, labelColor }: { label: string; value: number; total: number; color: string; bg: string; labelColor: string }) {
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

function EventCard({ msg, theme }: { msg: StreamMessage; theme: Theme }) {
  const c = COLORS[theme];
  const kind = getDetailedEventKind(msg);
  const colors = chipColorByKind(kind, theme);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const subagentInner = msg.type === "wire" && kind === "SubagentEvent" ? getSubagentInnerKind(msg.event) : undefined;
  const effectiveKind = subagentInner || kind;
  const effectiveEvent = msg.type === "wire"
    ? (getSubagentInnerEvent(msg.event) ?? msg.event)
    : undefined;
  const isError = msg.type === "wire" && eventHasError(effectiveEvent);
  const stepN = msg.type === "wire" && effectiveKind === "StepBegin" ? getStepBeginNumber(effectiveEvent) : undefined;
  const thinkText = msg.type === "wire" && effectiveKind === "ThinkPart" ? getThinkText(effectiveEvent) : undefined;
  const textPartText = msg.type === "wire" && effectiveKind === "TextPart" ? getTextPartText(effectiveEvent) : undefined;
  const toolCall = msg.type === "wire" && effectiveKind === "ToolCall" ? getToolCallSummary(effectiveEvent) : undefined;
  const toolArgs = msg.type === "wire" && effectiveKind === "ToolCall" ? getToolCallArgs(effectiveEvent) : undefined;
  const toolResult = msg.type === "wire" && effectiveKind === "ToolResult" ? getToolResultDetails(effectiveEvent) : undefined;
  const approvalReq = msg.type === "wire" && effectiveKind === "ApprovalRequest" ? getApprovalRequestDetails(effectiveEvent) : undefined;
  const tokenUsage = msg.type === "wire" && effectiveKind === "StatusUpdate" ? getTokenUsage(effectiveEvent) : undefined;

  return (
    <div
      style={{
        ...timelineItemStyle(c),
        ...(isError
          ? {
              background: theme === "dark" ? "rgba(239,68,68,0.10)" : "rgba(239,68,68,0.06)",
              borderLeft: "3px solid #ef4444"
            }
          : {})
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          flexWrap: "wrap"
        }}
      >
        {isError ? (
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#ef4444",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2
            }}
            title="异常"
          >
            !
          </span>
        ) : null}
        <div
          style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}
          onClick={() => setJsonOpen((o) => !o)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setJsonOpen((o) => !o);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: c.textMuted,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20
            }}
            title={jsonOpen ? "收起 JSON" : "展开 JSON"}
          >
            {jsonOpen ? "▼" : "▶"}
          </button>
          <span style={{ color: c.textSecondary, fontSize: 13 }}>{getEventDisplayTime(msg)}</span>
          <span style={{ background: colors.bg, color: colors.fg, padding: "2px 8px", borderRadius: 999 }}>{kind}</span>
          {subagentInner ? (
            <>
              <span style={{ color: c.textMuted, fontSize: 12, userSelect: "none" }}>→</span>
              <span
                style={{
                  background: chipColorByKind(subagentInner, theme).bg,
                  color: chipColorByKind(subagentInner, theme).fg,
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: 12
                }}
              >
                {subagentInner}
              </span>
            </>
          ) : null}
        </div>

        {msg.type === "wire" ? (
          isError ? (
            (() => {
              const err = getErrorDetails(effectiveEvent);
              return (
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 4 }}>
                  {err.output !== undefined ? (
                    <div>
                      <span style={{ color: c.textMuted }}>output: </span>
                      <span style={{ color: c.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{err.output}</span>
                    </div>
                  ) : null}
                  {err.message !== undefined ? (
                    <div>
                      <span style={{ color: c.textMuted }}>message: </span>
                      <span style={{ color: c.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{err.message}</span>
                    </div>
                  ) : null}
                </div>
              );
            })()
          ) : textPartText !== undefined ? (
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc", padding: 8, borderRadius: 6, border: `1px solid ${c.border}` }}>
              <span style={{ color: c.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{textPartText}</span>
            </div>
          ) : thinkText !== undefined ? (
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc", padding: 8, borderRadius: 6, border: `1px solid ${c.border}` }}>
              <span style={{ color: c.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{thinkText}</span>
            </div>
          ) : toolCall && (toolCall.id || toolCall.name) ? (
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {toolCall.id ? (
                  <code
                    style={{
                      color: c.textMuted,
                      fontFamily: "Consolas, Menlo, monospace",
                      fontSize: 12,
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: `1px solid ${c.border}`,
                      background: c.surfaceElevated
                    }}
                  >
                    {toolCall.id}
                  </code>
                ) : null}
                {toolCall.name ? <span style={{ color: c.text }}>{toolCall.name}()</span> : null}
              </div>
              {toolArgs ? (
                <pre style={{ margin: 0, background: c.codeBg, padding: 8, borderRadius: 6, fontSize: 12, overflow: "auto", border: `1px solid ${c.border}` }}>
                  <code style={{ color: c.text }}>{toolArgs}</code>
                </pre>
              ) : null}
            </div>
          ) : toolResult && (toolResult.tool_call_id || toolResult.return_value) ? (
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 4 }}>
              {toolResult.tool_call_id ? (
                <div>
                  <span style={{ color: c.textMuted }}>tool_call_id: </span>
                  <code
                    style={{
                      fontFamily: "Consolas, Menlo, monospace",
                      fontSize: 12,
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: `1px solid ${c.border}`,
                      background: c.surfaceElevated
                    }}
                  >
                    {toolResult.tool_call_id}
                  </code>
                </div>
              ) : null}
              {toolResult.return_value !== undefined ? (
                <pre
                  style={{
                    margin: 0,
                    background: toolResult.is_error ? (theme === "dark" ? "rgba(239,68,68,0.10)" : "#fef2f2") : c.codeBg,
                    padding: 8,
                    borderRadius: 6,
                    fontSize: 12,
                    overflow: "auto",
                    border: `1px solid ${toolResult.is_error ? (theme === "dark" ? "rgba(239,68,68,0.3)" : "#fecaca") : c.border}`
                  }}
                >
                  <code style={{ color: c.text }}>{toolResult.return_value}</code>
                </pre>
              ) : null}
            </div>
          ) : approvalReq && (approvalReq.operation || (approvalReq.files && approvalReq.files.length > 0)) ? (
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 4 }}>
              {approvalReq.operation ? (
                <div>
                  <span style={{ color: c.textMuted }}>操作: </span>
                  <span style={{ color: c.text }}>{approvalReq.operation}</span>
                </div>
              ) : null}
              {approvalReq.files && approvalReq.files.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: c.textMuted }}>涉及文件:</span>
                  {approvalReq.files.map((f, i) => (
                    <code
                      key={i}
                      style={{
                        fontFamily: "Consolas, Menlo, monospace",
                        fontSize: 12,
                        padding: "2px 6px",
                        borderRadius: 4,
                        border: `1px solid ${c.border}`,
                        background: c.surfaceElevated,
                        color: c.text
                      }}
                    >
                      {f}
                    </code>
                  ))}
                </div>
              ) : null}
            </div>
          ) : tokenUsage ? (
            (() => {
              const total = Math.max(1, tokenUsage.input_cache_read + tokenUsage.input_cache_creation + tokenUsage.input_other + tokenUsage.output);
              return (
                <div style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 4 }}>
                  <TokenBar label="output" value={tokenUsage.output} total={total} color="#22c55e" bg={theme === "dark" ? "#1f1f1f" : "#f1f5f9"} labelColor={c.textMuted} />
                  <TokenBar label="cache read" value={tokenUsage.input_cache_read} total={total} color="#3b82f6" bg={theme === "dark" ? "#1f1f1f" : "#f1f5f9"} labelColor={c.textMuted} />
                  <TokenBar label="cache creation" value={tokenUsage.input_cache_creation} total={total} color="#a855f7" bg={theme === "dark" ? "#1f1f1f" : "#f1f5f9"} labelColor={c.textMuted} />
                  <TokenBar label="other input" value={tokenUsage.input_other} total={total} color="#f59e0b" bg={theme === "dark" ? "#1f1f1f" : "#f1f5f9"} labelColor={c.textMuted} />
                </div>
              );
            })()
          ) : stepN !== undefined ? (
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6 }}>
              <span style={{ color: c.textMuted }}>step: </span>
              <span style={{ color: c.text }}>{stepN}</span>
            </div>
          ) : kind === "CompactionBegin" || kind === "CompactionEnd" || kind === "TurnEnd" ? (
            null
          ) : (
            <>
              <div
                onClick={() => setEventOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  color: c.textMuted,
                  fontSize: 13,
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: `1px solid ${c.border}`
                }}
                title={eventOpen ? "收起 event" : "展开 event"}
              >
                <span style={{ fontSize: 12, userSelect: "none" }}>{eventOpen ? "▼" : "▶"}</span>
                <span>event</span>
              </div>
              {eventOpen ? (
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6 }}>
                  {typeof msg.event === "object" && msg.event !== null && !Array.isArray(msg.event)
                    ? Object.entries(effectiveEvent as Record<string, unknown>).map(([k, v]) => (
                        <EventTreeNode key={k} label={k} data={v} depth={0} colors={c} />
                      ))
                    : <EventTreeNode data={effectiveEvent} depth={0} colors={c} />}
                </div>
              ) : null}
            </>
          )
        ) : null}
      </div>

      {msg.type === "meta" ? (
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
          <span style={{ color: c.textMuted }}>session_id: </span>
          <span style={{ color: c.text }}>{msg.session_id}</span>
        </div>
      ) : null}

      {jsonOpen ? (
        <pre
          style={{
            marginTop: 6,
            background: c.jsonBg,
            color: c.jsonText,
            padding: 10,
            borderRadius: 6,
            overflow: "auto",
            fontSize: 12
          }}
        >
          {JSON.stringify(msg, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export function App() {
  const [theme, toggleTheme] = useTheme();
  const c = COLORS[theme];

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [shareDir, setShareDir] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [events, setEvents] = useState<StreamMessage[]>([]);
  const [status, setStatus] = useState<string>("请选择会话");
  const [eventPage, setEventPage] = useState<number>(1);
  const [eventPageSize, setEventPageSize] = useState<number>(20);
  const [eventKindFilter, setEventKindFilter] = useState<string>("");
  const [eventErrorFilter, setEventErrorFilter] = useState<"all" | "error" | "normal">("all");
  const eventOffsetRef = useRef<number>(0);

  const [sidebarSearch, setSidebarSearch] = useState<string>("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [sidebarListMode, setSidebarListMode] = useState<"list" | "tree">("tree");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<"monitor" | "statistics">("monitor");
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [sseReconnectTrigger, setSseReconnectTrigger] = useState<number>(0);

  // Trace playback mode
  const [isTraceMode, setIsTraceMode] = useState(false);
  const [traceEvents, setTraceEvents] = useState<StreamMessage[]>([]);
  const [tracePage, setTracePage] = useState(1);
  const [tracePageSize, setTracePageSize] = useState(100);
  const [traceTotalPages, setTraceTotalPages] = useState(1);
  const [traceKeyword, setTraceKeyword] = useState("");
  const [traceLoading, setTraceLoading] = useState(false);

  async function fetchStatistics() {
    try {
      const res = await fetch("/api/statistics");
      if (!res.ok) throw new Error(`statistics http ${res.status}`);
      const data = (await res.json()) as StatisticsResponse;
      setStatistics(data);
    } catch {
      // ignore
    }
  }

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;
  const connectedTone = statusTone(status);
  const filteredTimelineItems = useMemo(() => {
    const timelineItems = events.slice(-300).reverse();
    return timelineItems.filter((e) => {
      if (eventKindFilter) {
        const kind = getDetailedEventKind(e);
        if (kind !== eventKindFilter) return false;
      }
      if (eventErrorFilter !== "all") {
        const isErr = e.type === "wire" ? eventHasError(e.event) : false;
        if (eventErrorFilter === "error" && !isErr) return false;
        if (eventErrorFilter === "normal" && isErr) return false;
      }
      return true;
    });
  }, [events, eventKindFilter, eventErrorFilter]);
  const totalEventPages = Math.max(1, Math.ceil(filteredTimelineItems.length / eventPageSize));
  const safeEventPage = Math.min(eventPage, totalEventPages);
  const pagedTimelineItems = filteredTimelineItems.slice((safeEventPage - 1) * eventPageSize, safeEventPage * eventPageSize);

  useEffect(() => {
    if (safeEventPage < eventPage) {
      setEventPage(safeEventPage);
    }
  }, [safeEventPage, eventPage]);

  const groupedSessions = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    for (const s of sessions) {
      const dir = s.work_dir || s.work_dir_hash || "未知目录";
      if (!map.has(dir)) map.set(dir, []);
      map.get(dir)!.push(s);
    }
    return Array.from(map.entries())
      .map(([dir, items]) => ({
        dir,
        items: items.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))
      }))
      .sort((a, b) => a.dir.localeCompare(b.dir));
  }, [sessions]);

  const filteredGroups = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return groupedSessions;
    return groupedSessions
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (s) =>
            s.session_id.toLowerCase().includes(q) ||
            (s.title && s.title.toLowerCase().includes(q)) ||
            (s.work_dir && s.work_dir.toLowerCase().includes(q))
        )
      }))
      .filter((g) => g.items.length > 0);
  }, [groupedSessions, sidebarSearch]);

  async function refreshSessions() {
    const qs = new URLSearchParams({
      page: "1",
      page_size: "100"
    });
    const res = await fetch(`/api/sessions?${qs.toString()}`);
    if (!res.ok) throw new Error(`sessions http ${res.status}`);
    const data = (await res.json()) as SessionsResponse;
    setShareDir(data.share_dir);
    setSessions(data.sessions);
    setSelectedSessionId((prev) => {
      if (!prev) return "";
      const stillExists = data.sessions.some((s) => s.session_id === prev);
      return stillExists ? prev : "";
    });
  }

  function resetCurrentSessionEvents() {
    setEvents([]);
    eventOffsetRef.current = 0;
    setEventPage(1);
  }

  async function fetchEventsOnce(sessionId: string) {
    const offset = eventOffsetRef.current;
    const qs = new URLSearchParams({
      session_id: sessionId,
      since_offset: String(offset)
    });
    const res = await fetch(`/api/events?${qs.toString()}`);
    if (!res.ok) throw new Error(`events http ${res.status}`);
    const data = (await res.json()) as {
      events: StreamMessage[];
      next_offset: number;
    };
    if (Array.isArray(data.events) && data.events.length > 0) {
      setEvents((prev) => {
        const base = prev.length > 2000 ? prev.slice(-1500) : prev;
        return [...base, ...data.events];
      });
      setEventPage(1);
    }
    eventOffsetRef.current = data.next_offset ?? offset;
  }

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.backgroundColor = c.bg;
    document.documentElement.style.backgroundColor = c.bg;
  }, [c.bg]);

  useEffect(() => {
    Promise.all([refreshSessions(), fetchStatistics()]).catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
    const t = window.setInterval(() => {
      refreshSessions().catch(() => void 0);
    }, 10000);
    const t2 = window.setInterval(() => {
      fetchStatistics().catch(() => void 0);
    }, 30000);
    return () => {
      window.clearInterval(t);
      window.clearInterval(t2);
    };
  }, []);

  useEffect(() => {
    if (!selectedSessionId) {
      setStatus("请选择会话");
      return;
    }

    if (isTraceMode) {
      setStatus("回放模式");
      return;
    }

    setStatus("连接中...");
    let es: EventSource | null = null;
    let reconnectTimer = 0;
    let isCleanClose = false;

    function connect() {
      if (es) {
        es.close();
        es = null;
      }
      isCleanClose = false;
      const qs = new URLSearchParams({
        session_id: selectedSessionId,
        since_offset: String(eventOffsetRef.current)
      });
      es = new EventSource(`/api/stream?${qs.toString()}`);

      es.onopen = () => {
        setStatus("已连接（SSE）");
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as StreamMessage & { next_offset?: number };
          if (data.type === "wire") {
            setEvents((prev) => {
              const base = prev.length > 2000 ? prev.slice(-1500) : prev;
              return [...base, data];
            });
            setEventPage(1);
            if (typeof data.next_offset === "number") {
              eventOffsetRef.current = data.next_offset;
            }
            maybeNotify(data);
          }
        } catch {
          // ignore malformed SSE message
        }
      };

      es.onerror = () => {
        setStatus("连接异常（尝试重连）");
        if (es) {
          es.close();
          es = null;
        }
        if (!isCleanClose) {
          reconnectTimer = window.setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    }

    fetchEventsOnce(selectedSessionId)
      .then(() => connect())
      .catch(() => {
        setStatus("连接异常（初始化失败）");
        connect();
      });

    return () => {
      isCleanClose = true;
      window.clearTimeout(reconnectTimer);
      if (es) {
        es.close();
        es = null;
      }
    };
  }, [selectedSessionId, sseReconnectTrigger, isTraceMode]);

  const filteredTraceEvents = useMemo(() => {
    if (!traceKeyword.trim()) return traceEvents;
    const q = traceKeyword.trim().toLowerCase();
    return traceEvents.filter((e) => {
      if (e.type !== "wire") return false;
      const kind = getDetailedEventKind(e);
      if (kind.toLowerCase().includes(q)) return true;
      try {
        const text = JSON.stringify(e.event).toLowerCase();
        return text.includes(q);
      } catch {
        return false;
      }
    });
  }, [traceEvents, traceKeyword]);

  const traceTotalEventPages = Math.max(1, Math.ceil(filteredTraceEvents.length / tracePageSize));
  const safeTraceEventPage = Math.min(tracePage, traceTotalEventPages);
  const pagedTraceEvents = filteredTraceEvents.slice((safeTraceEventPage - 1) * tracePageSize, safeTraceEventPage * tracePageSize);

  async function loadTracePage(sessionId: string, page: number, pageSize: number) {
    setTraceLoading(true);
    try {
      const qs = new URLSearchParams({
        session_id: sessionId,
        page: String(page),
        page_size: String(pageSize)
      });
      const res = await fetch(`/api/trace?${qs.toString()}`);
      if (!res.ok) throw new Error(`trace http ${res.status}`);
      const data = (await res.json()) as {
        events: StreamMessage[];
        pagination: { page: number; page_size: number; total: number; total_pages: number };
      };
      setTraceEvents(data.events);
      setTracePage(data.pagination.page);
      setTracePageSize(data.pagination.page_size);
      setTraceTotalPages(data.pagination.total_pages);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setTraceLoading(false);
    }
  }

  function enterTraceMode() {
    if (!selectedSessionId) return;
    setIsTraceMode(true);
    setTracePage(1);
    setTraceKeyword("");
    loadTracePage(selectedSessionId, 1, tracePageSize || 100);
  }

  function exitTraceMode() {
    setIsTraceMode(false);
    setTraceEvents([]);
    setTraceKeyword("");
    setTracePage(1);
  }

  async function handleReconnect() {
    if (!selectedSessionId) return;
    resetCurrentSessionEvents();
    setSseReconnectTrigger((n) => n + 1);
  }

  function selectSession(sessionId: string) {
    setSelectedSessionId(sessionId);
    requestNotificationPermission();
    if (isTraceMode) {
      setTracePage(1);
      setTraceKeyword("");
      loadTracePage(sessionId, 1, tracePageSize || 100);
    }
  }

  function deselectSession() {
    setSelectedSessionId("");
    resetCurrentSessionEvents();
    setStatus("请选择会话");
  }

  function toggleDir(dir: string) {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  }

  const pageShellStyle: React.CSSProperties = {
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
    background: c.bg,
    minHeight: "100vh",
    color: c.text,
    display: "flex",
    flexDirection: "column"
  };

  const panelStyle: React.CSSProperties = {
    marginTop: 14,
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: 12,
    color: c.text
  };

  const btnPrimaryStyle: React.CSSProperties = {
    border: `1px solid ${c.btnPrimaryBorder}`,
    background: c.btnPrimaryBg,
    color: c.btnPrimaryText,
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer"
  };

  const btnGhostStyle: React.CSSProperties = {
    border: `1px solid ${c.btnGhostBorder}`,
    background: c.btnGhostBg,
    color: c.btnGhostText,
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer"
  };

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${c.inputBorder}`,
    borderRadius: 8,
    padding: "6px 8px",
    background: c.inputBg,
    minWidth: 280,
    color: c.text
  };

  const selectedRowStyle: React.CSSProperties = { background: c.selectedRow };

  function renderSidebarTree() {
    if (filteredGroups.length === 0) {
      return (
        <div style={{ padding: "12px 16px", color: c.sidebarTextMuted, fontSize: 13 }}>
          暂无匹配会话
        </div>
      );
    }

    return (
      <div style={{ padding: "4px 0" }}>
        {filteredGroups.map((group) => {
          const isExpanded = expandedDirs.has(group.dir);
          const isActiveDir = group.items.some((s) => s.session_id === selectedSessionId);
          return (
            <div key={group.dir}>
              <button
                onClick={() => toggleDir(group.dir)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 16px",
                  background: "transparent",
                  border: "none",
                  color: isActiveDir ? c.sidebarText : c.sidebarTextMuted,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: isActiveDir ? 600 : 500
                }}
              >
                <span style={{ display: "inline-block", transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                  ▶
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {truncateText(group.dir, 28)}
                </span>
                <span style={{ color: c.sidebarTextMuted, fontSize: 11, fontWeight: 500 }}>
                  ({group.items.length})
                </span>
              </button>
              {isExpanded ? (
                <div>
                  {group.items.map((s) => {
                    const isSelected = s.session_id === selectedSessionId;
                    const displayTitle = s.title || truncateText(s.session_id, 24);
                    return (
                      <button
                        key={s.session_id}
                        onClick={() => selectSession(s.session_id)}
                        style={{
                          width: "100%",
                          padding: "6px 16px 6px 34px",
                          background: isSelected ? c.sidebarActiveBg : "transparent",
                          border: "none",
                          color: isSelected ? c.sidebarText : c.sidebarTextSecondary,
                          fontSize: 13,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          borderLeft: isSelected ? `2px solid ${c.sidebarActiveBorder}` : "2px solid transparent"
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: isSelected ? c.sidebarIndicator : c.sidebarIndicatorInactive,
                            flexShrink: 0
                          }}
                        />
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {displayTitle}
                        </span>
                        {isSelected ? (
                          <span style={{ fontSize: 10, color: c.sidebarTextMuted }}>当前</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  function renderSidebarList() {
    const filtered = sessions.filter((s) => {
      const q = sidebarSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        s.session_id.toLowerCase().includes(q) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.work_dir && s.work_dir.toLowerCase().includes(q))
      );
    });

    if (filtered.length === 0) {
      return (
        <div style={{ padding: "12px 16px", color: c.sidebarTextMuted, fontSize: 13 }}>
          暂无匹配会话
        </div>
      );
    }

    return (
      <div style={{ padding: "4px 0" }}>
        {filtered.map((s) => {
          const isSelected = s.session_id === selectedSessionId;
          const displayTitle = s.title || truncateText(s.session_id, 28);
          return (
            <button
              key={s.session_id}
              onClick={() => selectSession(s.session_id)}
              style={{
                width: "100%",
                padding: "8px 16px",
                background: isSelected ? c.sidebarActiveBg : "transparent",
                border: "none",
                color: isSelected ? c.sidebarText : c.sidebarTextSecondary,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderLeft: isSelected ? `2px solid ${c.sidebarActiveBorder}` : "2px solid transparent"
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isSelected ? c.sidebarIndicator : c.sidebarIndicatorInactive,
                  flexShrink: 0
                }}
              />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayTitle}
              </span>
              {isSelected ? (
                <span style={{ fontSize: 10, color: c.sidebarTextMuted }}>当前</span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  function renderStatistics() {
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

  const sb = {
    bg: c.sidebarBg,
    border: c.sidebarBorder,
    text: c.sidebarText,
    textMuted: c.sidebarTextMuted,
    inputBg: c.sidebarInputBg,
    inputBorder: c.sidebarInputBorder,
    btnBg: c.sidebarBtnBg,
    btnBorder: c.sidebarBtnBorder,
    btnText: c.sidebarBtnText
  };

  return (
    <div style={pageShellStyle}>
      <div style={monitorLayoutStyle}>
        <aside
          style={{
            flex: sidebarCollapsed ? "0 0 44px" : "0 0 280px",
            width: sidebarCollapsed ? 44 : 280,
            maxWidth: "100%",
            background: sb.bg,
            borderRight: `1px solid ${sb.border}`,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            color: sb.text,
            overflow: "hidden",
            transition: "flex 0.2s, width 0.2s"
          }}
        >
          {sidebarCollapsed ? (
            <>
              <div style={{ padding: "10px 0", display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    color: "#fff"
                  }}
                >
                  K
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ padding: "10px 0", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: `1px solid ${sb.btnBorder}`,
                    background: sb.btnBg,
                    color: sb.btnText,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title="展开侧边栏"
                >
                  ▶
                </button>
              </div>
            </>
          ) : (
            <>
          <div style={{ padding: "14px 14px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 12,
                  color: "#fff"
                }}
              >
                K
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: sb.text }}>Kimi Code CLI 监控中心</div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <div style={{ fontSize: 11, color: c.sidebarHeaderMuted, paddingTop: 2 }}>v0.1.0</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setCurrentView("monitor")}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: currentView === "monitor" ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)") : "transparent",
                    color: currentView === "monitor" ? sb.text : c.sidebarTextMuted,
                    cursor: "pointer"
                  }}
                >
                  Sessions
                </button>
                <button
                  onClick={() => setCurrentView("statistics")}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: currentView === "statistics" ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)") : "transparent",
                    color: currentView === "statistics" ? sb.text : c.sidebarTextMuted,
                    cursor: "pointer"
                  }}
                >
                  Statistics
                </button>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
                <button
                  title="刷新"
                  onClick={() => { refreshSessions().catch(() => void 0); fetchStatistics().catch(() => void 0); }}
                  style={{
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    border: `1px solid ${sb.btnBorder}`,
                    background: sb.btnBg,
                    color: sb.btnText,
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                >
                  ⟳
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Search sessions..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                style={{
                  flex: 1,
                  background: sb.inputBg,
                  border: `1px solid ${sb.inputBorder}`,
                  borderRadius: 8,
                  padding: "7px 10px",
                  color: sb.text,
                  fontSize: 13,
                  outline: "none"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <button
                onClick={() => setSidebarListMode("tree")}
                style={{
                  width: 28,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  border: `1px solid ${sb.btnBorder}`,
                  fontSize: 14,
                  cursor: "pointer",
                  background: sidebarListMode === "tree" ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)") : "transparent",
                  color: sidebarListMode === "tree" ? sb.text : c.sidebarTextMuted
                }}
                title="树状视图"
              >
                <TreeIcon />
              </button>
              <button
                onClick={() => setSidebarListMode("list")}
                style={{
                  width: 28,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  border: `1px solid ${sb.btnBorder}`,
                  fontSize: 14,
                  cursor: "pointer",
                  background: sidebarListMode === "list" ? (theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)") : "transparent",
                  color: sidebarListMode === "list" ? sb.text : c.sidebarTextMuted
                }}
                title="列表视图"
              >
                <ListIcon />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {sidebarListMode === "tree" ? renderSidebarTree() : renderSidebarList()}
          </div>

          <div style={{ padding: "10px 14px", borderTop: `1px solid ${sb.border}`, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setSidebarCollapsed(true)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${sb.btnBorder}`,
                background: sb.btnBg,
                color: sb.btnText,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="收起侧边栏"
            >
              ◀
            </button>
          </div>
          </>
        )}
        </aside>

        <main style={mainMonitorStyle}>
          {currentView === "statistics" ? (
            <section style={{ ...panelStyle, marginTop: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {renderStatistics()}
            </section>
          ) : (
            <>
              <div style={monitorTopBarStyle(c)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>
                    {isTraceMode ? "历史事件回放" : "实时事件监控"}
                  </div>
                  <div style={{ marginTop: 2, color: c.textMuted, fontSize: 12 }}>
                    会话：{renderTruncatedCode(selectedSessionId || "-", 360)}
                    {!isTraceMode ? ` | 最新事件：${latestEvent ? getDetailedEventKind(latestEvent) : "-"}` : null}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {!isTraceMode ? (
                <>
                  <StatPill title="状态" value={status} tone={connectedTone} theme={theme} />
                  <StatPill title="事件数" value={String(events.length)} theme={theme} />
                  <button style={btnGhostStyle} onClick={handleReconnect} disabled={!selectedSessionId}>
                    重连流
                  </button>
                  <button style={btnGhostStyle} onClick={enterTraceMode} disabled={!selectedSessionId}>
                    历史回放
                  </button>
                </>
              ) : (
                <button style={btnGhostStyle} onClick={exitTraceMode}>
                  返回实时监控
                </button>
              )}
            </div>
          </div>

          <section style={{ ...panelStyle, marginTop: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {!selectedSessionId ? (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: c.textMuted,
                  gap: 12
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 600, color: c.textSecondary }}>请选择会话</div>
                <div style={{ fontSize: 14 }}>从左侧边栏选择一个 Session 开始实时监控</div>
              </div>
            ) : isTraceMode ? (
              <>
                <div style={toolbarRowStyle(c)}>
                  <div style={filtersStyle}>
                    <input
                      type="text"
                      placeholder="搜索关键字或事件类型..."
                      value={traceKeyword}
                      onChange={(e) => { setTraceKeyword(e.target.value); setTracePage(1); }}
                      style={{ ...inputStyle, minWidth: 200 }}
                    />
                    <label style={fieldLabelStyle(c)}>
                      每页
                      <select
                        style={{ ...inputStyle, minWidth: 88 }}
                        value={tracePageSize}
                        onChange={(e) => {
                          const nextSize = Number(e.target.value);
                          setTracePageSize(nextSize);
                          setTracePage(1);
                          loadTracePage(selectedSessionId, 1, nextSize);
                        }}
                      >
                        {[10, 20, 50, 100].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      style={btnGhostStyle}
                      onClick={() => {
                        const next = Math.max(1, safeTraceEventPage - 1);
                        setTracePage(next);
                        loadTracePage(selectedSessionId, next, tracePageSize);
                      }}
                      disabled={safeTraceEventPage <= 1}
                    >
                      上一页
                    </button>
                    <span style={{ color: c.textSecondary, fontSize: 13 }}>
                      第 <b>{safeTraceEventPage}</b> / {traceTotalEventPages} 页，共 {filteredTraceEvents.length} 条（服务端共 {traceTotalPages} 页）
                    </span>
                    <button
                      style={btnGhostStyle}
                      onClick={() => {
                        const next = Math.min(traceTotalEventPages, safeTraceEventPage + 1);
                        setTracePage(next);
                        loadTracePage(selectedSessionId, next, tracePageSize);
                      }}
                      disabled={safeTraceEventPage >= traceTotalEventPages}
                    >
                      下一页
                    </button>
                    <button style={btnGhostStyle} onClick={() => loadTracePage(selectedSessionId, tracePage, tracePageSize)} disabled={traceLoading}>
                      {traceLoading ? "加载中..." : "刷新"}
                    </button>
                  </div>
                </div>

                <div style={timelinePanelStyle(c)}>
                  {traceLoading ? (
                    <div style={{ padding: 16, color: c.textMuted }}>加载中...</div>
                  ) : filteredTraceEvents.length === 0 ? (
                    <div style={{ padding: 16, color: c.textMuted }}>当前页暂无匹配事件</div>
                  ) : (
                    pagedTraceEvents.map((e, idx) => (
                      <EventCard key={`trace-${safeTraceEventPage}-${idx}`} msg={e} theme={theme} />
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={toolbarRowStyle(c)}>
                  <div style={filtersStyle}>
                    <label style={fieldLabelStyle(c)}>
                      每页
                      <select
                        style={{ ...inputStyle, minWidth: 88 }}
                        value={eventPageSize}
                        onChange={(e) => {
                          setEventPageSize(Number(e.target.value));
                          setEventPage(1);
                        }}
                      >
                        {[10, 20, 50, 100].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={fieldLabelStyle(c)}>
                      类型
                      <select
                        style={{ ...inputStyle, minWidth: 130 }}
                        value={eventKindFilter}
                        onChange={(e) => {
                          setEventKindFilter(e.target.value);
                          setEventPage(1);
                        }}
                      >
                        <option value="">全部</option>
                        {[
                          "ApprovalRequest",
                          "ApprovalResponse",
                          "CompactionBegin",
                          "CompactionEnd",
                          "StatusUpdate",
                          "StepBegin",
                          "TextPart",
                          "ThinkPart",
                          "ToolCall",
                          "ToolCallPart",
                          "ToolResult",
                          "TurnBegin",
                          "TurnEnd",
                        ].map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={fieldLabelStyle(c)}>
                      状态
                      <select
                        style={{ ...inputStyle, minWidth: 100 }}
                        value={eventErrorFilter}
                        onChange={(e) => {
                          setEventErrorFilter(e.target.value as "all" | "error" | "normal");
                          setEventPage(1);
                        }}
                      >
                        <option value="all">全部</option>
                        <option value="normal">正常</option>
                        <option value="error">异常</option>
                      </select>
                    </label>
                    <button style={btnGhostStyle} onClick={() => setEventPage((p) => Math.max(1, p - 1))} disabled={safeEventPage <= 1}>
                      上一页
                    </button>
                    <span style={{ color: c.textSecondary, fontSize: 13 }}>
                      第 <b>{safeEventPage}</b> / {totalEventPages} 页，共 {filteredTimelineItems.length} 条
                    </span>
                    <button
                      style={btnGhostStyle}
                      onClick={() => setEventPage((p) => Math.min(totalEventPages, p + 1))}
                      disabled={safeEventPage >= totalEventPages}
                    >
                      下一页
                    </button>
                    <button style={btnGhostStyle} onClick={() => resetCurrentSessionEvents()}>清空</button>
                  </div>
                </div>

                <div style={timelinePanelStyle(c)}>
                  {filteredTimelineItems.length === 0 ? <div style={{ padding: 16, color: c.textMuted }}>当前会话暂无匹配事件</div> : null}
                  {pagedTimelineItems.map((e, idx) => (
                    <EventCard key={`${safeEventPage}-${idx}`} msg={e} theme={theme} />
                  ))}
                </div>
              </>
            )}
            </section>
          </>
        )}
        </main>
      </div>
    </div>
  );
}

function statusTone(status: string): "good" | "warn" | "neutral" {
  if (status.includes("异常")) return "warn";
  if (status.includes("已连接")) return "good";
  return "neutral";
}

function StatCard(props: { title: string; value: string; tone?: "good" | "warn" | "neutral"; mono?: boolean; theme: Theme }) {
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

function StatPill(props: { title: string; value: string; tone?: "good" | "warn" | "neutral"; theme: Theme }) {
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

const monitorLayoutStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
  overflow: "hidden"
};

const mainMonitorStyle: React.CSSProperties = {
  flex: "1 1 0",
  minWidth: 0,
  position: "relative",
  display: "flex",
  flexDirection: "column",
  padding: "14px"
};

function monitorTopBarStyle(c: typeof COLORS.light): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 12
  };
}

function toolbarRowStyle(c: typeof COLORS.light): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    color: c.text
  };
}

const filtersStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap"
};

function fieldLabelStyle(c: typeof COLORS.light): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: c.textSecondary
  };
}

function timelinePanelStyle(c: typeof COLORS.light): React.CSSProperties {
  return {
    marginTop: 8,
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    background: c.surface
  };
}

function timelineItemStyle(c: typeof COLORS.light): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderBottom: `1px solid ${c.timelineBorder}`,
    color: c.text
  };
}

function statCardStyle(c: typeof COLORS.light): React.CSSProperties {
  return {
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    height: "100%",
    boxSizing: "border-box"
  };
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
