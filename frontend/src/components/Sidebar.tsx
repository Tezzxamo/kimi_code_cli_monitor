import React from "react";
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
  sessionSortBy,
  setSessionSortBy,
  onRefresh,
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
  sessionSortBy: "updated_at" | "created_at" | "title" | "has_error";
  setSessionSortBy: (v: "updated_at" | "created_at" | "title" | "has_error") => void;
  onRefresh: () => void;
}) {
  const c = COLORS[theme];

  const sortedSessions = React.useMemo(() => {
    const arr = [...sessions];
    arr.sort((a, b) => {
      switch (sessionSortBy) {
        case "created_at":
          return (b.created_at || 0) - (a.created_at || 0);
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        case "has_error":
          return (b.has_error ? 1 : 0) - (a.has_error ? 1 : 0);
        default:
          return (b.updated_at || 0) - (a.updated_at || 0);
      }
    });
    return arr;
  }, [sessions, sessionSortBy]);

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
        items: items.sort((a, b) => {
          switch (sessionSortBy) {
            case "created_at":
              return (b.created_at || 0) - (a.created_at || 0);
            case "title":
              return (a.title || "").localeCompare(b.title || "");
            case "has_error":
              return (b.has_error ? 1 : 0) - (a.has_error ? 1 : 0);
            default:
              return (b.updated_at || 0) - (a.updated_at || 0);
          }
        })
      }))
      .sort((a, b) => a.dir.localeCompare(b.dir));
  }, [sortedSessions, sessionSortBy]);

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
        transition: "flex 0.2s, width 0.2s"
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
          <select
            value={sessionSortBy}
            onChange={(e) => setSessionSortBy(e.target.value as typeof sessionSortBy)}
            style={{
              background: sb.inputBg,
              border: `1px solid ${sb.inputBorder}`,
              borderRadius: 8,
              padding: "7px 8px",
              color: sb.text,
              fontSize: 12,
              outline: "none",
              cursor: "pointer"
            }}
            title="排序方式"
          >
            <option value="updated_at">更新时间</option>
            <option value="created_at">创建时间</option>
            <option value="title">标题</option>
            <option value="has_error">异常优先</option>
          </select>
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
        {sidebarListMode === "tree" ? (
          <TreeView
            groups={filteredGroups}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            selectedSessionId={selectedSessionId}
            onSelectSession={onSelectSession}
            colors={c}
          />
        ) : (
          <ListView
            sessions={filteredList}
            selectedSessionId={selectedSessionId}
            onSelectSession={onSelectSession}
            colors={c}
          />
        )}
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
}: {
  groups: Array<{ dir: string; items: SessionItem[] }>;
  expandedDirs: Set<string>;
  toggleDir: (dir: string) => void;
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  colors: ThemeColors;
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
                  const displayTitle = s.title || truncateText(s.session_id, 24);
                  return (
                    <button
                      key={s.session_id}
                      onClick={() => onSelectSession(s.session_id)}
                      style={{
                        width: "100%",
                        padding: "6px 16px 6px 34px",
                        background: isSelected ? colors.sidebarActiveBg : "transparent",
                        border: "none",
                        color: isSelected ? colors.sidebarText : colors.sidebarTextSecondary,
                        fontSize: 13,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        borderLeft: isSelected ? `2px solid ${colors.sidebarActiveBorder}` : "2px solid transparent"
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: isSelected
                            ? colors.sidebarIndicator
                            : colors.sidebarIndicatorInactive,
                          flexShrink: 0
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {displayTitle}
                      </span>
                      {isSelected ? (
                        <span style={{ fontSize: 10, color: colors.sidebarTextMuted }}>当前</span>
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

function ListView({
  sessions,
  selectedSessionId,
  onSelectSession,
  colors,
}: {
  sessions: SessionItem[];
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  colors: ThemeColors;
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
        const displayTitle = s.title || truncateText(s.session_id, 28);
        return (
          <button
            key={s.session_id}
            onClick={() => onSelectSession(s.session_id)}
            style={{
              width: "100%",
              padding: "8px 16px",
              background: isSelected ? colors.sidebarActiveBg : "transparent",
              border: "none",
              color: isSelected ? colors.sidebarText : colors.sidebarTextSecondary,
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderLeft: isSelected ? `2px solid ${colors.sidebarActiveBorder}` : "2px solid transparent"
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isSelected
                  ? colors.sidebarIndicator
                  : colors.sidebarIndicatorInactive,
                flexShrink: 0
              }}
            />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayTitle}
            </span>
            {isSelected ? (
              <span style={{ fontSize: 10, color: colors.sidebarTextMuted }}>当前</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
