import React, { useEffect, useRef, useState } from "react";
import type { SessionItem, Theme } from "../types";
import { COLORS } from "../hooks/useTheme";
import type { ThemeColors } from "../hooks/useTheme";
import { truncateText } from "../utils/formatters";
import { TreeIcon, ListIcon } from "./Icons";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar({
  theme,
  toggleTheme,
  sessions,
  selectedSessionId,
  onSelectSession,
  sidebarSearch,
  setSidebarSearch,
  expandedDirs,
  toggleDir,
  sidebarListMode,
  setSidebarListMode,
  sidebarCollapsed,
  setSidebarCollapsed,
  currentView,
  setCurrentView,
  onRefresh,
  onRenameSession,
  onDeleteSession,
  selectedSessionIds,
  onToggleSelectSession,
  onClearSelection,
  onSelectAllSessions,
  onBatchDeleteSessions,
}: {
  theme: Theme;
  toggleTheme: () => void;
  sessions: SessionItem[];
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  sidebarSearch: string;
  setSidebarSearch: (v: string) => void;
  expandedDirs: Set<string>;
  toggleDir: (dir: string) => void;
  sidebarListMode: "list" | "tree";
  setSidebarListMode: (v: "list" | "tree") => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  currentView: "monitor" | "statistics";
  setCurrentView: (v: "monitor" | "statistics") => void;
  onRefresh: () => void;
  onRenameSession: (id: string, title: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  selectedSessionIds: Set<string>;
  onToggleSelectSession: (id: string) => void;
  onClearSelection: () => void;
  onSelectAllSessions: (ids: string[]) => void;
  onBatchDeleteSessions: (ids: string[]) => Promise<void>;
}) {
  const c = COLORS[theme];

  const sortedSessions = React.useMemo(() => {
    const arr = [...sessions];
    arr.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
    return arr;
  }, [sessions]);

  const groupedSessions = React.useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    for (const s of sortedSessions) {
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
  }, [sortedSessions]);

  const filteredGroups = React.useMemo(() => {
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

  const filteredList = React.useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return sortedSessions;
    return sortedSessions.filter(
      (s) =>
        s.session_id.toLowerCase().includes(q) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.work_dir && s.work_dir.toLowerCase().includes(q))
    );
  }, [sortedSessions, sidebarSearch]);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
    sessionTitle: string;
  } | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    function handleClick() {
      setContextMenu(null);
    }
    if (contextMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  function handleContextMenu(e: React.MouseEvent, session: SessionItem) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      sessionId: session.session_id,
      sessionTitle: session.title || session.session_id,
    });
  }

  function startRename(sessionId: string, currentTitle: string) {
    setContextMenu(null);
    setEditingId(sessionId);
    setEditingValue(currentTitle);
  }

  async function commitRename(sessionId: string) {
    const value = editingValue.trim();
    setEditingId(null);
    setEditingValue("");
    if (value) {
      try {
        await onRenameSession(sessionId, value);
      } catch (err) {
        console.error("Rename failed:", err);
        window.alert("重命名失败: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  }

  function cancelRename() {
    setEditingId(null);
    setEditingValue("");
  }

  async function confirmDelete(sessionId: string) {
    setContextMenu(null);
    if (window.confirm("确定要删除该会话吗？此操作不可恢复。")) {
      try {
        await onDeleteSession(sessionId);
      } catch (err) {
        console.error("Delete failed:", err);
        window.alert("删除失败: " + (err instanceof Error ? err.message : String(err)));
      }
    }
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

  if (sidebarCollapsed) {
    return (
      <aside
        style={{
          flex: "0 0 44px",
          width: 44,
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
      </aside>
    );
  }

  return (
    <aside
      style={{
        flex: "0 0 280px",
        width: 280,
        maxWidth: "100%",
        background: sb.bg,
        borderRight: `1px solid ${sb.border}`,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        color: sb.text,
        overflow: "hidden",
        transition: "flex 0.2s, width 0.2s",
        position: "relative"
      }}
    >
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
              onClick={onRefresh}
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

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {sidebarListMode === "tree" ? (
          <TreeView
            groups={filteredGroups}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            selectedSessionId={selectedSessionId}
            onSelectSession={onSelectSession}
            colors={c}
            editingId={editingId}
            editingValue={editingValue}
            editInputRef={editInputRef}
            onStartEdit={startRename}
            onCommitEdit={commitRename}
            onCancelEdit={cancelRename}
            onSetEditingValue={setEditingValue}
            onContextMenuSession={handleContextMenu}
            selectedSessionIds={selectedSessionIds}
            onToggleSelectSession={onToggleSelectSession}
          />
        ) : (
          <ListView
            sessions={filteredList}
            selectedSessionId={selectedSessionId}
            onSelectSession={onSelectSession}
            colors={c}
            editingId={editingId}
            editingValue={editingValue}
            editInputRef={editInputRef}
            onStartEdit={startRename}
            onCommitEdit={commitRename}
            onCancelEdit={cancelRename}
            onSetEditingValue={setEditingValue}
            onContextMenuSession={handleContextMenu}
            selectedSessionIds={selectedSessionIds}
            onToggleSelectSession={onToggleSelectSession}
          />
        )}
      </div>

      {/* Batch actions bar */}
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${sb.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={filteredList.length > 0 && filteredList.every((s) => selectedSessionIds.has(s.session_id))}
            onChange={() => {
              if (filteredList.every((s) => selectedSessionIds.has(s.session_id))) {
                onClearSelection();
              } else {
                onSelectAllSessions(filteredList.map((s) => s.session_id));
              }
            }}
            style={{ width: 14, height: 14, cursor: "pointer" }}
          />
          <span style={{ fontSize: 12, color: sb.textMuted }}>
            已选择 {selectedSessionIds.size} 项
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              const ids = Array.from(selectedSessionIds);
              if (ids.length === 0) return;
              if (window.confirm(`确定要删除选中的 ${ids.length} 个会话吗？此操作不可恢复。`)) {
                onBatchDeleteSessions(ids).catch((err) => {
                  console.error("Batch delete failed:", err);
                  window.alert("批量删除失败: " + (err instanceof Error ? err.message : String(err)));
                });
              }
            }}
            disabled={selectedSessionIds.size === 0}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${selectedSessionIds.size === 0 ? "#9ca3af" : "#ef4444"}`,
              background: selectedSessionIds.size === 0 ? "transparent" : "rgba(239,68,68,0.1)",
              color: selectedSessionIds.size === 0 ? "#9ca3af" : "#ef4444",
              fontSize: 12,
              cursor: selectedSessionIds.size === 0 ? "not-allowed" : "pointer",
            }}
          >
            删除选中
          </button>
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
      </div>

      {/* Context Menu */}
      {contextMenu ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
            background: c.sidebarBg,
            border: `1px solid ${c.sidebarBorder}`,
            borderRadius: 8,
            boxShadow: theme === "dark" ? "0 4px 16px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.12)",
            padding: "4px 0",
            minWidth: 120,
            fontSize: 13,
          }}
        >
          <button
            onClick={() => startRename(contextMenu.sessionId, contextMenu.sessionTitle)}
            style={{
              width: "100%",
              padding: "8px 14px",
              background: "transparent",
              border: "none",
              color: c.sidebarText,
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.sidebarActiveBg; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <span>✏️</span>
            <span>重命名</span>
          </button>
          <div style={{ height: 1, background: c.sidebarBorder, margin: "2px 8px" }} />
          <button
            onClick={() => confirmDelete(contextMenu.sessionId)}
            style={{
              width: "100%",
              padding: "8px 14px",
              background: "transparent",
              border: "none",
              color: "#ef4444",
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = theme === "dark" ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <span>🗑️</span>
            <span>删除</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function TreeView({
  groups,
  expandedDirs,
  toggleDir,
  selectedSessionId,
  onSelectSession,
  colors,
  editingId,
  editingValue,
  editInputRef,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onSetEditingValue,
  onContextMenuSession,
  selectedSessionIds,
  onToggleSelectSession,
}: {
  groups: Array<{ dir: string; items: SessionItem[] }>;
  expandedDirs: Set<string>;
  toggleDir: (dir: string) => void;
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  colors: ThemeColors;
  editingId: string | null;
  editingValue: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onStartEdit: (id: string, title: string) => void;
  onCommitEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSetEditingValue: (v: string) => void;
  onContextMenuSession: (e: React.MouseEvent, session: SessionItem) => void;
  selectedSessionIds: Set<string>;
  onToggleSelectSession: (id: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <div style={{ padding: "12px 16px", color: colors.sidebarTextMuted, fontSize: 13 }}>
        暂无匹配会话
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0" }}>
      {groups.map((group) => {
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
                color: isActiveDir ? colors.sidebarText : colors.sidebarTextMuted,
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
              <span style={{ color: colors.sidebarTextMuted, fontSize: 11, fontWeight: 500 }}>
                ({group.items.length})
              </span>
            </button>
            {isExpanded ? (
              <div>
                {group.items.map((s) => {
                  const isSelected = s.session_id === selectedSessionId;
                  const isEditing = s.session_id === editingId;
                  const displayTitle = s.title || truncateText(s.session_id, 24);
                  const isChecked = selectedSessionIds.has(s.session_id);
                  return (
                    <div
                      key={s.session_id}
                      onContextMenu={(e) => onContextMenuSession(e, s)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: isSelected ? colors.sidebarActiveBg : "transparent",
                        borderLeft: isSelected ? `2px solid ${colors.sidebarActiveBorder}` : "2px solid transparent",
                        padding: "0 16px 0 30px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSelectSession(s.session_id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: 14,
                          height: 14,
                          marginRight: 6,
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      />
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: isSelected
                            ? colors.sidebarIndicator
                            : colors.sidebarIndicatorInactive,
                          flexShrink: 0,
                          marginRight: 8,
                        }}
                      />
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          value={editingValue}
                          onChange={(e) => onSetEditingValue(e.target.value)}
                          onBlur={() => onCommitEdit(s.session_id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onCommitEdit(s.session_id);
                            if (e.key === "Escape") onCancelEdit();
                          }}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            background: colors.sidebarInputBg,
                            border: `1px solid ${colors.sidebarInputBorder}`,
                            borderRadius: 4,
                            padding: "4px 8px",
                            color: colors.sidebarText,
                            fontSize: 13,
                            outline: "none",
                            margin: "4px 0",
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => onSelectSession(s.session_id)}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            background: "transparent",
                            border: "none",
                            color: isSelected ? colors.sidebarText : colors.sidebarTextSecondary,
                            fontSize: 13,
                            cursor: "pointer",
                            textAlign: "left",
                            padding: "6px 0",
                          }}
                        >
                          {displayTitle}
                        </button>
                      )}
                      {isSelected && !isEditing ? (
                        <span style={{ fontSize: 10, color: colors.sidebarTextMuted, marginLeft: 4 }}>当前</span>
                      ) : null}
                    </div>
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

function ListView({
  sessions,
  selectedSessionId,
  onSelectSession,
  colors,
  editingId,
  editingValue,
  editInputRef,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onSetEditingValue,
  onContextMenuSession,
  selectedSessionIds,
  onToggleSelectSession,
}: {
  sessions: SessionItem[];
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  colors: ThemeColors;
  editingId: string | null;
  editingValue: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onStartEdit: (id: string, title: string) => void;
  onCommitEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSetEditingValue: (v: string) => void;
  onContextMenuSession: (e: React.MouseEvent, session: SessionItem) => void;
  selectedSessionIds: Set<string>;
  onToggleSelectSession: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div style={{ padding: "12px 16px", color: colors.sidebarTextMuted, fontSize: 13 }}>
        暂无匹配会话
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0" }}>
      {sessions.map((s) => {
        const isSelected = s.session_id === selectedSessionId;
        const isEditing = s.session_id === editingId;
        const displayTitle = s.title || truncateText(s.session_id, 28);
        const isChecked = selectedSessionIds.has(s.session_id);
        return (
          <div
            key={s.session_id}
            onContextMenu={(e) => onContextMenuSession(e, s)}
            style={{
              display: "flex",
              alignItems: "center",
              background: isSelected ? colors.sidebarActiveBg : "transparent",
              borderLeft: isSelected ? `2px solid ${colors.sidebarActiveBorder}` : "2px solid transparent",
              padding: "0 16px 0 12px",
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleSelectSession(s.session_id)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 14,
                height: 14,
                marginRight: 6,
                flexShrink: 0,
                cursor: "pointer",
              }}
            />
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isSelected
                  ? colors.sidebarIndicator
                  : colors.sidebarIndicatorInactive,
                flexShrink: 0,
                marginRight: 8,
              }}
            />
            {isEditing ? (
              <input
                ref={editInputRef}
                value={editingValue}
                onChange={(e) => onSetEditingValue(e.target.value)}
                onBlur={() => onCommitEdit(s.session_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitEdit(s.session_id);
                  if (e.key === "Escape") onCancelEdit();
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: colors.sidebarInputBg,
                  border: `1px solid ${colors.sidebarInputBorder}`,
                  borderRadius: 4,
                  padding: "4px 8px",
                  color: colors.sidebarText,
                  fontSize: 13,
                  outline: "none",
                  margin: "4px 0",
                }}
              />
            ) : (
              <button
                onClick={() => onSelectSession(s.session_id)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  background: "transparent",
                  border: "none",
                  color: isSelected ? colors.sidebarText : colors.sidebarTextSecondary,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "8px 0",
                }}
              >
                {displayTitle}
              </button>
            )}
            {isSelected && !isEditing ? (
              <span style={{ fontSize: 10, color: colors.sidebarTextMuted, marginLeft: 4 }}>当前</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
