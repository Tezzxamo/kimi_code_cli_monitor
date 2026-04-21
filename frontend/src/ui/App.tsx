import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  SessionItem,
  SessionSummary,
  SessionsResponse,
  StreamMessage,
  StatisticsResponse,
  Theme,
  TurnGroup
} from "../types";
import { useTheme, COLORS } from "../hooks/useTheme";
import type { ThemeColors } from "../hooks/useTheme";
import {
  getDetailedEventKind,
  eventHasError,
  valuesInclude
} from "../utils/eventHelpers";
import { formatDuration, getEventDisplayTime, statusTone } from "../utils/formatters";
import Sidebar from "../components/Sidebar";
import StatisticsPanel from "../components/StatisticsPanel";
import EventCard from "../components/EventCard";
import StatPill from "../components/StatPill";
import TruncatedCode from "../components/TruncatedCode";

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

  if (kind === "ApprovalRequest") {
    new window.Notification("Kimi CLI Monitor", { body: "收到新的操作确认请求" });
  }
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
  const [eventKeywordFilter, setEventKeywordFilter] = useState<string>("");
  const eventOffsetRef = useRef<number>(0);

  const [sidebarSearch, setSidebarSearch] = useState<string>("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [sidebarListMode, setSidebarListMode] = useState<"list" | "tree">("tree");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<"monitor" | "statistics">("monitor");
  const [sessionSortBy, setSessionSortBy] = useState<"updated_at" | "created_at" | "title" | "has_error">("updated_at");
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [sseReconnectTrigger, setSseReconnectTrigger] = useState<number>(0);

  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isTraceMode, setIsTraceMode] = useState(false);
  const [traceEvents, setTraceEvents] = useState<StreamMessage[]>([]);
  const [tracePage, setTracePage] = useState(1);
  const [tracePageSize, setTracePageSize] = useState(100);
  const [traceTotalPages, setTraceTotalPages] = useState(1);
  const [traceKeyword, setTraceKeyword] = useState("");
  const [traceLoading, setTraceLoading] = useState(false);

  const [isContextMode, setIsContextMode] = useState(false);
  const [contextEvents, setContextEvents] = useState<StreamMessage[]>([]);
  const [contextPage, setContextPage] = useState(1);
  const [contextPageSize, setContextPageSize] = useState(50);
  const [contextTotalPages, setContextTotalPages] = useState(1);
  const [contextLoading, setContextLoading] = useState(false);

  const [isTurnView, setIsTurnView] = useState(false);
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());

  const [timelineScrollTop, setTimelineScrollTop] = useState(0);
  const timelineContainerHeightRef = useRef(600);
  const ITEM_ESTIMATE_HEIGHT = 80;
  const OVERSCAN = 5;

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
    const timelineItems = events.slice(-2000).reverse();
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
      if (eventKeywordFilter.trim()) {
        const q = eventKeywordFilter.trim().toLowerCase();
        const kind = getDetailedEventKind(e);
        if (kind.toLowerCase().includes(q)) return true;
        if (e.type === "wire" && valuesInclude(e.event, q)) return true;
        return false;
      }
      return true;
    });
  }, [events, eventKindFilter, eventErrorFilter, eventKeywordFilter]);

  const totalEventPages = Math.max(1, Math.ceil(filteredTimelineItems.length / eventPageSize));
  const safeEventPage = Math.min(eventPage, totalEventPages);
  const pagedTimelineItems = filteredTimelineItems.slice((safeEventPage - 1) * eventPageSize, safeEventPage * eventPageSize);

  const turnGroups = useMemo(() => {
    const groups: TurnGroup[] = [];
    let current: TurnGroup | null = null;
    let turnIdx = 0;
    for (const e of events) {
      const kind = e.type === "wire" ? getDetailedEventKind(e) : "";
      if (kind === "TurnBegin") {
        if (current) groups.push(current);
        turnIdx++;
        current = { turnIndex: turnIdx, beginEvent: e, events: [e] };
      } else if (current) {
        current.events.push(e);
      } else {
        if (groups.length === 0 || groups[groups.length - 1].turnIndex !== 0) {
          groups.push({ turnIndex: 0, events: [e] });
        } else {
          groups[groups.length - 1].events.push(e);
        }
      }
    }
    if (current) groups.push(current);
    return groups;
  }, [events]);

  const filteredTurnGroups = useMemo(() => {
    let groups = [...turnGroups].reverse();
    if (eventKindFilter) {
      groups = groups.filter((g) => g.events.some((e) => getDetailedEventKind(e) === eventKindFilter));
    }
    if (eventErrorFilter !== "all") {
      groups = groups.filter((g) =>
        g.events.some((e) => {
          const isErr = e.type === "wire" ? eventHasError(e.event) : false;
          return eventErrorFilter === "error" ? isErr : !isErr;
        })
      );
    }
    if (eventKeywordFilter.trim()) {
      const q = eventKeywordFilter.trim().toLowerCase();
      groups = groups.filter((g) =>
        g.events.some((e) => {
          const kind = getDetailedEventKind(e);
          if (kind.toLowerCase().includes(q)) return true;
          return e.type === "wire" && valuesInclude(e.event, q);
        })
      );
    }
    return groups;
  }, [turnGroups, eventKindFilter, eventErrorFilter, eventKeywordFilter]);

  const totalTurnPages = Math.max(1, Math.ceil(filteredTurnGroups.length / eventPageSize));
  const safeTurnPage = Math.min(eventPage, totalTurnPages);
  const pagedTurnGroups = filteredTurnGroups.slice((safeTurnPage - 1) * eventPageSize, safeTurnPage * eventPageSize);

  const virtualRange = useMemo(() => {
    const items = isTurnView ? pagedTurnGroups : pagedTimelineItems;
    const totalItems = items.length;
    const containerHeight = timelineContainerHeightRef.current;
    const startIndex = Math.max(0, Math.floor(timelineScrollTop / ITEM_ESTIMATE_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(totalItems, Math.ceil((timelineScrollTop + containerHeight) / ITEM_ESTIMATE_HEIGHT) + OVERSCAN);
    const paddingTop = startIndex * ITEM_ESTIMATE_HEIGHT;
    const paddingBottom = Math.max(0, (totalItems - endIndex) * ITEM_ESTIMATE_HEIGHT);
    return { startIndex, endIndex, paddingTop, paddingBottom, totalItems };
  }, [timelineScrollTop, isTurnView, pagedTimelineItems, pagedTurnGroups]);

  useEffect(() => {
    if (safeEventPage < eventPage) {
      setEventPage(safeEventPage);
    }
  }, [safeEventPage, eventPage]);

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

  async function fetchSessionSummary(sessionId: string) {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/summary`);
      if (!res.ok) throw new Error(`summary http ${res.status}`);
      const data = (await res.json()) as SessionSummary;
      setSessionSummary(data);
    } catch {
      setSessionSummary(null);
    }
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
    if (selectedSessionId) {
      fetchSessionSummary(selectedSessionId);
    } else {
      setSessionSummary(null);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el || isTraceMode) return;
    el.scrollTop = 0;
  }, [events, isTraceMode]);

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
    let heartbeatTimer = 0;
    let isCleanClose = false;
    let reconnectAttempts = 0;
    let lastMessageTime = Date.now();

    function getReconnectDelay() {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      return delay;
    }

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
        reconnectAttempts = 0;
        lastMessageTime = Date.now();
        setStatus("已连接（SSE）");
      };

      es.onmessage = (e) => {
        lastMessageTime = Date.now();
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
        setStatus(`连接异常（${reconnectAttempts + 1} 次重连）`);
        if (es) {
          es.close();
          es = null;
        }
        if (!isCleanClose) {
          reconnectTimer = window.setTimeout(() => {
            connect();
          }, getReconnectDelay());
        }
      };
    }

    heartbeatTimer = window.setInterval(() => {
      if (es && es.readyState === EventSource.OPEN && Date.now() - lastMessageTime > 15000) {
        setStatus("连接静默（强制重连）");
        if (es) {
          es.close();
          es = null;
        }
        connect();
      }
    }, 5000);

    fetchEventsOnce(selectedSessionId)
      .then(() => connect())
      .catch(() => {
        setStatus("连接异常（初始化失败）");
        connect();
      });

    return () => {
      isCleanClose = true;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(heartbeatTimer);
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

  async function loadContextPage(sessionId: string, page: number, pageSize: number) {
    setContextLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize)
      });
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/context?${qs.toString()}`);
      if (!res.ok) throw new Error(`context http ${res.status}`);
      const data = (await res.json()) as {
        events: StreamMessage[];
        pagination: { page: number; page_size: number; total: number; total_pages: number };
      };
      setContextEvents(data.events);
      setContextPage(data.pagination.page);
      setContextPageSize(data.pagination.page_size);
      setContextTotalPages(data.pagination.total_pages);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setContextLoading(false);
    }
  }

  function enterContextMode() {
    if (!selectedSessionId) return;
    setIsContextMode(true);
    setContextPage(1);
    loadContextPage(selectedSessionId, 1, contextPageSize || 50);
  }

  function exitContextMode() {
    setIsContextMode(false);
    setContextEvents([]);
    setContextPage(1);
  }

  async function handleReconnect() {
    if (!selectedSessionId) return;
    resetCurrentSessionEvents();
    setSseReconnectTrigger((n) => n + 1);
  }

  function selectSession(sessionId: string) {
    if (sessionId === selectedSessionId) return;
    setSelectedSessionId(sessionId);
    resetCurrentSessionEvents();
    requestNotificationPermission();
    if (isTraceMode) {
      setTracePage(1);
      setTraceKeyword("");
      loadTracePage(sessionId, 1, tracePageSize || 100);
    }
    if (isContextMode) {
      setContextPage(1);
      loadContextPage(sessionId, 1, contextPageSize || 50);
    }
  }

  function deselectSession() {
    setSelectedSessionId("");
    resetCurrentSessionEvents();
    setStatus("请选择会话");
  }

  function handleTimelineScroll() {
    const el = timelineRef.current;
    if (!el) return;
    setTimelineScrollTop(el.scrollTop);
    timelineContainerHeightRef.current = el.clientHeight;
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

  function monitorTopBarStyle(c: ThemeColors): React.CSSProperties {
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

  function toolbarRowStyle(c: ThemeColors): React.CSSProperties {
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

  function fieldLabelStyle(c: ThemeColors): React.CSSProperties {
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 13,
      color: c.textSecondary
    };
  }

  function timelinePanelStyle(c: ThemeColors): React.CSSProperties {
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

  return (
    <div style={pageShellStyle}>
      <div style={monitorLayoutStyle}>
        <Sidebar
          theme={theme}
          toggleTheme={toggleTheme}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={selectSession}
          sidebarSearch={sidebarSearch}
          setSidebarSearch={setSidebarSearch}
          expandedDirs={expandedDirs}
          toggleDir={toggleDir}
          sidebarListMode={sidebarListMode}
          setSidebarListMode={setSidebarListMode}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          currentView={currentView}
          setCurrentView={setCurrentView}
          sessionSortBy={sessionSortBy}
          setSessionSortBy={setSessionSortBy}
          onRefresh={() => { refreshSessions().catch(() => void 0); fetchStatistics().catch(() => void 0); }}
        />

        <main style={mainMonitorStyle}>
          {currentView === "statistics" ? (
            <section style={{ ...panelStyle, marginTop: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <StatisticsPanel statistics={statistics} theme={theme} />
            </section>
          ) : (
            <>
              <div style={monitorTopBarStyle(c)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>
                        {isTraceMode ? "历史事件回放" : isContextMode ? "上下文快照" : "实时事件监控"}
                      </div>
                      <div style={{ marginTop: 2, color: c.textMuted, fontSize: 12 }}>
                        会话：<TruncatedCode text={selectedSessionId || "-"} maxWidth={360} />
                        {!isTraceMode ? ` | 最新事件：${latestEvent ? getDetailedEventKind(latestEvent) : "-"}` : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {!isTraceMode && !isContextMode ? (
                    <>
                      <StatPill title="状态" value={status} tone={connectedTone} theme={theme} />
                      <StatPill title="事件数" value={String(events.length)} theme={theme} />
                      <button style={btnGhostStyle} onClick={handleReconnect} disabled={!selectedSessionId}>
                        重连流
                      </button>
                      <button style={btnGhostStyle} onClick={enterTraceMode} disabled={!selectedSessionId}>
                        历史回放
                      </button>
                      <button style={btnGhostStyle} onClick={enterContextMode} disabled={!selectedSessionId}>
                        上下文
                      </button>
                    </>
                  ) : isTraceMode ? (
                    <button style={btnGhostStyle} onClick={exitTraceMode}>
                      返回实时监控
                    </button>
                  ) : (
                    <button style={btnGhostStyle} onClick={exitContextMode}>
                      返回实时监控
                    </button>
                  )}
                </div>
              </div>

              <section style={{ ...panelStyle, marginTop: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                {selectedSessionId && sessionSummary ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      padding: "10px 12px",
                      marginBottom: 10,
                      background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc",
                      border: `1px solid ${c.border}`,
                      borderRadius: 8
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: c.textMuted }}>运行时长</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: c.text }}>{formatDuration(sessionSummary.duration_ms)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: c.textMuted }}>Turn 数</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: c.text }}>{sessionSummary.total_turns}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: c.textMuted }}>Token 数</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: c.text }}>{sessionSummary.total_tokens}</div>
                    </div>
                    {sessionSummary.has_error ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                        <span style={{ fontSize: 11, color: "#ef4444" }}>包含异常</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
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

                    <div ref={timelineRef} onScroll={handleTimelineScroll} style={timelinePanelStyle(c)}>
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
                ) : isContextMode ? (
                  <>
                    <div style={toolbarRowStyle(c)}>
                      <div style={filtersStyle}>
                        <label style={fieldLabelStyle(c)}>
                          每页
                          <select
                            style={{ ...inputStyle, minWidth: 88 }}
                            value={contextPageSize}
                            onChange={(e) => {
                              const nextSize = Number(e.target.value);
                              setContextPageSize(nextSize);
                              setContextPage(1);
                              loadContextPage(selectedSessionId, 1, nextSize);
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
                            const next = Math.max(1, contextPage - 1);
                            setContextPage(next);
                            loadContextPage(selectedSessionId, next, contextPageSize);
                          }}
                          disabled={contextPage <= 1}
                        >
                          上一页
                        </button>
                        <span style={{ color: c.textSecondary, fontSize: 13 }}>
                          第 <b>{contextPage}</b> / {contextTotalPages} 页
                        </span>
                        <button
                          style={btnGhostStyle}
                          onClick={() => {
                            const next = Math.min(contextTotalPages, contextPage + 1);
                            setContextPage(next);
                            loadContextPage(selectedSessionId, next, contextPageSize);
                          }}
                          disabled={contextPage >= contextTotalPages}
                        >
                          下一页
                        </button>
                        <button style={btnGhostStyle} onClick={() => loadContextPage(selectedSessionId, contextPage, contextPageSize)} disabled={contextLoading}>
                          {contextLoading ? "加载中..." : "刷新"}
                        </button>
                      </div>
                    </div>
                    <div style={timelinePanelStyle(c)}>
                      {contextLoading ? (
                        <div style={{ padding: 16, color: c.textMuted }}>加载中...</div>
                      ) : contextEvents.length === 0 ? (
                        <div style={{ padding: 16, color: c.textMuted }}>当前会话暂无上下文数据</div>
                      ) : (
                        contextEvents.map((e, idx) => (
                          <EventCard key={`ctx-${contextPage}-${idx}`} msg={e} theme={theme} />
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
                        <input
                          type="text"
                          placeholder="搜索事件内容..."
                          value={eventKeywordFilter}
                          onChange={(e) => { setEventKeywordFilter(e.target.value); setEventPage(1); }}
                          style={{ ...inputStyle, minWidth: 160, fontSize: 13 }}
                        />
                        <button style={btnGhostStyle} onClick={() => setEventPage((p) => Math.max(1, p - 1))} disabled={isTurnView ? safeTurnPage <= 1 : safeEventPage <= 1}>
                          上一页
                        </button>
                        <span style={{ color: c.textSecondary, fontSize: 13 }}>
                          {isTurnView
                            ? <>第 <b>{safeTurnPage}</b> / {totalTurnPages} 页，共 {filteredTurnGroups.length} 个 Turn</>
                            : <>第 <b>{safeEventPage}</b> / {totalEventPages} 页，共 {filteredTimelineItems.length} 条</>}
                        </span>
                        <button
                          style={btnGhostStyle}
                          onClick={() => setEventPage((p) => Math.min(isTurnView ? totalTurnPages : totalEventPages, p + 1))}
                          disabled={isTurnView ? safeTurnPage >= totalTurnPages : safeEventPage >= totalEventPages}
                        >
                          下一页
                        </button>
                        <button style={btnGhostStyle} onClick={() => resetCurrentSessionEvents()}>清空</button>
                        <button
                          style={{
                            ...btnGhostStyle,
                            borderColor: isTurnView ? c.btnPrimaryBorder : c.btnGhostBorder,
                            color: isTurnView ? c.btnPrimaryText : c.btnGhostText,
                            background: isTurnView ? c.btnPrimaryBg : c.btnGhostBg
                          }}
                          onClick={() => { setIsTurnView((v) => !v); setEventPage(1); }}
                        >
                          {isTurnView ? "列表视图" : "Turn 视图"}
                        </button>
                      </div>
                    </div>

                    <div ref={timelineRef} onScroll={handleTimelineScroll} style={timelinePanelStyle(c)}>
                      {filteredTimelineItems.length === 0 && !isTurnView ? <div style={{ padding: 16, color: c.textMuted }}>当前会话暂无匹配事件</div> : null}
                      {isTurnView && filteredTurnGroups.length === 0 ? <div style={{ padding: 16, color: c.textMuted }}>当前会话暂无匹配 Turn</div> : null}
                      <div style={{ paddingTop: virtualRange.paddingTop, paddingBottom: virtualRange.paddingBottom }}>
                        {(isTurnView ? pagedTurnGroups : pagedTimelineItems)
                          .slice(virtualRange.startIndex, virtualRange.endIndex)
                          .map((e, idx) => {
                            const realIndex = virtualRange.startIndex + idx;
                            if (isTurnView) {
                              const g = e as TurnGroup;
                              const isExpanded = expandedTurns.has(g.turnIndex);
                              const turnText = g.turnIndex > 0 ? `Turn ${g.turnIndex}` : "未分组事件";
                              const toolCount = g.events.filter((ev) => getDetailedEventKind(ev) === "ToolCall").length;
                              return (
                                <div key={g.turnIndex} style={{ borderBottom: `1px solid ${c.timelineBorder}` }}>
                                  <div
                                    onClick={() => {
                                      setExpandedTurns((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(g.turnIndex)) next.delete(g.turnIndex);
                                        else next.add(g.turnIndex);
                                        return next;
                                      });
                                    }}
                                    style={{
                                      padding: "10px 12px",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      background: g.turnIndex > 0 ? (theme === "dark" ? "rgba(59,130,246,0.08)" : "#eff6ff") : "transparent"
                                    }}
                                  >
                                    <span style={{ fontSize: 12, userSelect: "none", color: c.textMuted }}>{isExpanded ? "▼" : "▶"}</span>
                                    <span style={{ fontWeight: 600, fontSize: 14, color: c.text }}>{turnText}</span>
                                    <span style={{ fontSize: 12, color: c.textMuted }}>({g.events.length} 事件{toolCount > 0 ? `, ${toolCount} 工具调用` : ""})</span>
                                  </div>
                                  {isExpanded ? (
                                    <div>
                                      {g.events.map((ev, eidx) => (
                                        <EventCard key={`turn-${g.turnIndex}-${eidx}`} msg={ev} theme={theme} />
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            }
                            return <EventCard key={`${safeEventPage}-${realIndex}`} msg={e as StreamMessage} theme={theme} />;
                          })}
                      </div>
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
