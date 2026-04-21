import React, { useState } from "react";
import type { ThemeColors } from "../hooks/useTheme";
import { formatEventTreeValue } from "../utils/formatters";

export default function EventTreeNode({
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
  colors: ThemeColors;
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
