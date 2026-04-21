import React, { useState } from "react";
import type { StreamMessage, Theme } from "../types";
import { COLORS } from "../hooks/useTheme";
import type { ThemeColors } from "../hooks/useTheme";
import {
  getDetailedEventKind,
  eventHasError,
  getSubagentInnerKind,
  getSubagentInnerEvent,
  getStepBeginNumber,
  getThinkText,
  getTextPartText,
  getToolCallSummary,
  getToolCallArgs,
  getToolResultDetails,
  getApprovalRequestDetails,
  getTokenUsage,
  getTurnBeginText,
  getErrorDetails
} from "../utils/eventHelpers";
import { chipColorByKind, getEventDisplayTime } from "../utils/formatters";
import EventTreeNode from "./EventTreeNode";
import CollapsibleText from "./CollapsibleText";
import TokenBar from "./TokenBar";

export default function EventCard({ msg, theme }: { msg: StreamMessage; theme: Theme }) {
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
  const turnBeginText = msg.type === "wire" && effectiveKind === "TurnBegin" ? getTurnBeginText(effectiveEvent) : undefined;

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
            <CollapsibleText text={textPartText} theme={theme} colors={c} />
          ) : turnBeginText !== undefined ? (
            <CollapsibleText text={turnBeginText} theme={theme} colors={c} />
          ) : thinkText !== undefined ? (
            <CollapsibleText text={thinkText} theme={theme} colors={c} />
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

function timelineItemStyle(c: ThemeColors): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderBottom: `1px solid ${c.timelineBorder}`,
    color: c.text
  };
}
