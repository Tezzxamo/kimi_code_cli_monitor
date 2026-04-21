import React from "react";

export default function TruncatedCode({ text, maxWidth = 260 }: { text?: string | null; maxWidth?: number }) {
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
