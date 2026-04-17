from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .jsonl_tail import TailState, read_jsonl_since, tail_jsonl
from .kimi_sessions import (
    iter_sessions,
    load_work_dir_map,
    read_state_title,
    resolve_session,
)
from .settings import get_settings


app = FastAPI(title="Kimi CLI Realtime Monitor", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "time": _now_iso()}


@app.get("/api/sessions")
def list_sessions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=200),
    work_dir_contains: Optional[str] = Query(default=None),
) -> JSONResponse:
    settings = get_settings()
    work_dir_map = load_work_dir_map(settings.kimi_share_dir)
    items = []
    for s in iter_sessions(settings.kimi_share_dir):
        title = read_state_title(s.state_path)
        session_dir_stat = s.session_dir.stat()
        wire_mtime = s.wire_path.stat().st_mtime if s.wire_path.exists() else None
        items.append(
            {
                "session_id": s.session_id,
                "work_dir_hash": s.work_dir_hash,
                "work_dir": work_dir_map.get(s.work_dir_hash),
                "title": title,
                "session_dir": str(s.session_dir),
                "wire_path": str(s.wire_path),
                "created_at": session_dir_stat.st_ctime,
                "updated_at": wire_mtime,
            }
        )
    if work_dir_contains:
        q = work_dir_contains.strip().lower()
        if q:
            items = [
                i
                for i in items
                if q in str(i.get("work_dir") or "").lower()
                or q in str(i.get("work_dir_hash") or "").lower()
            ]

    items = sorted(items, key=lambda i: i.get("updated_at") or 0, reverse=True)
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    paged = items[start:end]
    return JSONResponse(
        {
            "share_dir": str(settings.kimi_share_dir),
            "sessions": paged,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
            },
        }
    )


@app.get("/api/work-dirs")
def list_work_dirs(limit: int = Query(default=200, ge=1, le=2000)) -> JSONResponse:
    settings = get_settings()
    work_dir_map = load_work_dir_map(settings.kimi_share_dir)
    stats: dict[str, dict] = {}

    for s in iter_sessions(settings.kimi_share_dir):
        wd = work_dir_map.get(s.work_dir_hash) or s.work_dir_hash
        wire_mtime = s.wire_path.stat().st_mtime if s.wire_path.exists() else 0
        if wd not in stats:
            stats[wd] = {"work_dir": wd, "session_count": 0, "latest_updated_at": 0}
        stats[wd]["session_count"] += 1
        if wire_mtime > stats[wd]["latest_updated_at"]:
            stats[wd]["latest_updated_at"] = wire_mtime

    items = sorted(stats.values(), key=lambda i: i["latest_updated_at"], reverse=True)[:limit]
    return JSONResponse({"work_dirs": items})


@app.get("/api/statistics")
def get_statistics() -> JSONResponse:
    """
    全量扫描所有会话的 wire.jsonl，生成统计摘要。
    注意：此接口不做缓存，每次请求都会重新遍历目录并读取文件；
    在会话数或文件体积极大时可能产生较高的 CPU/IO 开销。
    """
    settings = get_settings()
    work_dir_map = load_work_dir_map(settings.kimi_share_dir)

    total_sessions = 0
    total_turns = 0
    total_tokens = 0
    total_duration_ms = 0.0

    daily_sessions: dict[str, int] = defaultdict(int)
    daily_turns: dict[str, int] = defaultdict(int)

    tool_calls: dict[str, int] = defaultdict(int)
    tool_errors: dict[str, int] = defaultdict(int)
    pending_tool_calls: dict[str, str] = {}

    project_stats: dict[str, dict] = defaultdict(lambda: {"sessions": 0, "turns": 0})

    for s in iter_sessions(settings.kimi_share_dir):
        wd = work_dir_map.get(s.work_dir_hash) or s.work_dir_hash
        total_sessions += 1
        project_stats[wd]["sessions"] += 1

        created = s.session_dir.stat().st_ctime
        updated = s.wire_path.stat().st_mtime if s.wire_path.exists() else created
        if updated and created:
            total_duration_ms += max(0, (updated - created)) * 1000

        date_key = datetime.fromtimestamp(created).strftime("%Y-%m-%d")
        daily_sessions[date_key] += 1

        if s.wire_path.exists():
            try:
                with open(s.wire_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if not line.strip():
                            continue
                        try:
                            obj = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        msg = obj.get("message", {})
                        msg_type = msg.get("type")
                        payload = msg.get("payload", {}) or {}

                        def _add_tokens(tu: dict) -> None:
                            nonlocal total_tokens
                            if not tu:
                                return
                            total_tokens += (
                                tu.get("input_other", 0)
                                + tu.get("input_cache_read", 0)
                                + tu.get("input_cache_creation", 0)
                                + tu.get("output", 0)
                            )

                        # Count turns from both top-level and nested SubagentEvent events
                        if msg_type == "TurnBegin":
                            total_turns += 1
                            project_stats[wd]["turns"] += 1
                            ts = obj.get("timestamp") or updated
                            if ts:
                                dkey = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                                daily_turns[dkey] += 1

                        # Nested turn inside SubagentEvent
                        nested_turn_event = payload.get("event", {}) or {}
                        if nested_turn_event.get("type") == "TurnBegin":
                            total_turns += 1
                            project_stats[wd]["turns"] += 1
                            ts = obj.get("timestamp") or updated
                            if ts:
                                dkey = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                                daily_turns[dkey] += 1

                        # Token usage top-level
                        if msg_type == "StatusUpdate":
                            _add_tokens(payload.get("token_usage") or {})

                        # Nested token usage
                        nested_event_payload = nested_turn_event.get("payload", {}) or {}
                        if "token_usage" in nested_event_payload:
                            _add_tokens(nested_event_payload.get("token_usage") or {})

                        # Tool calls (top-level and nested SubagentEvent)
                        if msg_type == "ToolCall":
                            func = payload.get("function") or {}
                            name = func.get("name") or "Unknown"
                            tid = payload.get("id") or payload.get("tool_call_id")
                            if tid:
                                pending_tool_calls[tid] = name
                            tool_calls[name] += 1

                        nested_tool_event = payload.get("event", {}) or {}
                        if nested_tool_event.get("type") == "ToolCall":
                            nested_func = nested_tool_event.get("payload", {}).get("function") or {}
                            name = nested_func.get("name") or "Unknown"
                            tid = (
                                nested_tool_event.get("payload", {}).get("id")
                                or nested_tool_event.get("payload", {}).get("tool_call_id")
                            )
                            if tid:
                                pending_tool_calls[tid] = name
                            tool_calls[name] += 1

                        if msg_type == "ToolResult":
                            tid = payload.get("tool_call_id")
                            name = pending_tool_calls.pop(tid, None) if tid else None
                            rv = payload.get("return_value", {}) or {}
                            is_err = rv.get("is_error", False) if isinstance(rv, dict) else False
                            if name:
                                if is_err:
                                    tool_errors[name] += 1
                            else:
                                if is_err:
                                    tool_errors["Unknown"] += 1

                        nested_result_event = payload.get("event", {}) or {}
                        if nested_result_event.get("type") == "ToolResult":
                            nested_payload = nested_result_event.get("payload", {}) or {}
                            tid = nested_payload.get("tool_call_id")
                            name = pending_tool_calls.pop(tid, None) if tid else None
                            rv = nested_payload.get("return_value", {}) or {}
                            is_err = rv.get("is_error", False) if isinstance(rv, dict) else False
                            if name:
                                if is_err:
                                    tool_errors[name] += 1
                            else:
                                if is_err:
                                    tool_errors["Unknown"] += 1
            except Exception:
                pass

    today = datetime.now().date()
    daily_usage = []
    for i in range(30):
        d = today - timedelta(days=i)
        dstr = d.strftime("%Y-%m-%d")
        daily_usage.append(
            {
                "date": dstr,
                "sessions": daily_sessions.get(dstr, 0),
                "turns": daily_turns.get(dstr, 0),
            }
        )
    daily_usage.reverse()

    tool_usage = [
        {"tool": name, "calls": calls, "errors": tool_errors.get(name, 0)}
        for name, calls in sorted(tool_calls.items(), key=lambda x: -x[1])[:20]
    ]

    top_projects = sorted(
        [{"work_dir": wd, "sessions": v["sessions"], "turns": v["turns"]} for wd, v in project_stats.items()],
        key=lambda x: -x["turns"],
    )[:20]

    return JSONResponse(
        {
            "total_sessions": total_sessions,
            "total_turns": total_turns,
            "total_tokens": total_tokens,
            "total_duration_ms": int(total_duration_ms),
            "daily_usage": daily_usage,
            "tool_usage": tool_usage,
            "top_projects": top_projects,
        }
    )


@app.get("/api/stream")
async def stream(
    session_id: str = Query(..., min_length=1),
    poll_interval_s: float = Query(default=1.0, ge=0.2, le=5.0),
    since_offset: Optional[int] = Query(default=None, ge=0),
) -> StreamingResponse:
    settings = get_settings()
    s = resolve_session(settings.kimi_share_dir, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="session not found")

    async def gen():
        # SSE: each message is "data: <json>\n\n"
        st = TailState(offset=since_offset or 0)
        # First ping with meta (helps frontend know it connected)
        meta = {"type": "meta", "time": _now_iso(), "session_id": session_id}
        yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"
        async for obj in tail_jsonl(s.wire_path, poll_interval_s=poll_interval_s, state=st):
            payload = {"type": "wire", "time": _now_iso(), "event": obj}
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/api/events")
def list_events(
    session_id: str = Query(..., min_length=1),
    since_offset: int = Query(default=0, ge=0),
) -> JSONResponse:
    settings = get_settings()
    s = resolve_session(settings.kimi_share_dir, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="session not found")

    items, next_offset = read_jsonl_since(s.wire_path, since_offset=since_offset)

    events = [{"type": "wire", "time": _now_iso(), "event": obj} for obj in items]
    return JSONResponse(
        {
            "session_id": session_id,
            "events": events,
            "since_offset": since_offset,
            "next_offset": next_offset,
            "count": len(events),
        }
    )


# 部署模式：若前端构建产物存在，则由后端直接托管静态文件
_dist_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _dist_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_dist_dir), html=True), name="static")

