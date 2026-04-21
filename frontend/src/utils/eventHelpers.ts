import type { StreamMessage } from "../types";

export function getEventKind(msg: StreamMessage): string {
  if (msg.type !== "wire") return "meta";
  const evt = msg.event;
  const candidateKeys = ["type", "event", "kind", "name", "op"] as const;
  for (const k of candidateKeys) {
    const val = evt[k];
    if (typeof val === "string" && val.trim()) return val;
  }
  return "wire";
}

export function getDetailedEventKind(msg: StreamMessage): string {
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

export function eventHasError(evt: Record<string, unknown> | undefined): boolean {
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

export function getSubagentInnerKind(evt: Record<string, unknown>): string | undefined {
  const parsed = parseWireEvent(evt);
  return asString(parsed.flat["message.payload.event.type"]);
}

export function getSubagentInnerEvent(evt: Record<string, unknown>): Record<string, unknown> | undefined {
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

export function getStepBeginNumber(evt: Record<string, unknown> | undefined): number | undefined {
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

export function getThinkText(evt: Record<string, unknown> | undefined): string | undefined {
  if (!evt) return undefined;
  const parsed = parseWireEvent(evt);
  return asString(parsed.flat["message.payload.think"]) ?? asString(parsed.flat["payload.think"]);
}

export function getTextPartText(evt: Record<string, unknown> | undefined): string | undefined {
  if (!evt) return undefined;
  const parsed = parseWireEvent(evt);
  return asString(parsed.flat["message.payload.text"]) ?? asString(parsed.flat["payload.text"]);
}

export function getTurnBeginText(evt: Record<string, unknown> | undefined): string | undefined {
  if (!evt) return undefined;
  const parsed = parseWireEvent(evt);
  return (
    asString(parsed.flat["message.payload.text"]) ??
    asString(parsed.flat["payload.text"]) ??
    asString(parsed.flat["text"])
  );
}

export function getToolCallSummary(evt: Record<string, unknown> | undefined): { id?: string; name?: string } {
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

export function getErrorDetails(evt: Record<string, unknown> | undefined): { output?: string; message?: string } {
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

export function getToolCallArgs(evt: Record<string, unknown> | undefined): string | undefined {
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

export function getToolCallPartDetails(evt: Record<string, unknown> | undefined): { arguments_part?: string } {
  if (!evt) return {};
  const parsed = parseWireEvent(evt);
  return {
    arguments_part: asString(parsed.flat["message.payload.arguments_part"]) ?? asString(parsed.flat["payload.arguments_part"])
  };
}

export function getToolResultDetails(evt: Record<string, unknown> | undefined): { tool_call_id?: string; return_value?: string; is_error?: boolean; output?: string; message?: string } {
  if (!evt) return {};
  const parsed = parseWireEvent(evt);
  const id = asString(parsed.flat["message.payload.tool_call_id"]) ?? asString(parsed.flat["payload.tool_call_id"]);
  const isErr = parsed.flat["message.payload.is_error"] === true
    || parsed.flat["payload.is_error"] === true
    || parsed.flat["message.payload.return_value.is_error"] === true
    || parsed.flat["payload.return_value.is_error"] === true;
  const rv = parsed.flat["message.payload.return_value"] ?? parsed.flat["payload.return_value"];
  let rvStr: string | undefined;
  let output: string | undefined;
  let message: string | undefined;
  if (rv !== undefined) {
    if (typeof rv === "string") {
      rvStr = rv.length > 500 ? rv.slice(0, 500) + "..." : rv;
    } else if (typeof rv === "object" && rv !== null) {
      const rvObj = rv as Record<string, unknown>;
      output = typeof rvObj.output === "string" ? rvObj.output : undefined;
      message = typeof rvObj.message === "string" ? rvObj.message : undefined;
      rvStr = JSON.stringify(rv);
      if (rvStr.length > 500) rvStr = rvStr.slice(0, 500) + "...";
    }
  }
  return { tool_call_id: id, return_value: rvStr, is_error: isErr, output, message };
}

export function getApprovalRequestDetails(evt: Record<string, unknown> | undefined): { operation?: string; files?: string[] } {
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

export function getTokenUsage(evt: Record<string, unknown> | undefined): { input_cache_read: number; input_cache_creation: number; input_other: number; output: number } | undefined {
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

export function valuesInclude(obj: unknown, q: string): boolean {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === "string") return obj.toLowerCase().includes(q);
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj).toLowerCase().includes(q);
  if (Array.isArray(obj)) return obj.some((v) => valuesInclude(v, q));
  if (typeof obj === "object") return Object.values(obj as Record<string, unknown>).some((v) => valuesInclude(v, q));
  return false;
}

export function parseWireEvent(raw: Record<string, unknown>): { normalized: Record<string, unknown>; flat: Record<string, unknown> } {
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

export function summarizeEvent(msg: StreamMessage): string {
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

export function extractEventFields(msg: StreamMessage): Array<{ key: string; value: string }> {
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
