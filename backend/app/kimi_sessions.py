from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional


@dataclass(frozen=True)
class SessionRef:
    session_id: str
    session_dir: Path
    work_dir_hash: str
    state_path: Path
    wire_path: Path
    context_path: Path


def md5_hex(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def sessions_root(share_dir: Path) -> Path:
    return share_dir / "sessions"


def list_work_dir_hashes(share_dir: Path) -> list[Path]:
    root = sessions_root(share_dir)
    if not root.exists():
        return []
    return sorted([p for p in root.iterdir() if p.is_dir()], key=lambda p: p.name)


def iter_sessions(share_dir: Path) -> Iterable[SessionRef]:
    root = sessions_root(share_dir)
    if not root.exists():
        return

    for work_hash_dir in list_work_dir_hashes(share_dir):
        for sess_dir in sorted(
            [p for p in work_hash_dir.iterdir() if p.is_dir()],
            key=lambda p: p.name,
            reverse=True,
        ):
            wire = sess_dir / "wire.jsonl"
            state = sess_dir / "state.json"
            context = sess_dir / "context.jsonl"
            if not wire.exists():
                continue
            yield SessionRef(
                session_id=sess_dir.name,
                session_dir=sess_dir,
                work_dir_hash=work_hash_dir.name,
                state_path=state,
                wire_path=wire,
                context_path=context,
            )


def resolve_session(share_dir: Path, session_id: str) -> Optional[SessionRef]:
    for s in iter_sessions(share_dir):
        if s.session_id == session_id:
            return s
    return None


def read_state_title(state_path: Path) -> Optional[str]:
    try:
        if not state_path.exists():
            return None
        data = json.loads(state_path.read_text(encoding="utf-8"))
        title = data.get("title")
        return title if isinstance(title, str) and title.strip() else None
    except Exception:
        return None


def load_work_dir_map(share_dir: Path) -> dict[str, str]:
    """
    Return mapping: work_dir_hash -> work_dir_path.
    Source: ~/.kimi/kimi.json, field `work_dirs`.
    """
    meta_file = share_dir / "kimi.json"
    if not meta_file.exists():
        return {}

    try:
        data = json.loads(meta_file.read_text(encoding="utf-8"))
    except Exception:
        return {}

    work_dirs = data.get("work_dirs")
    if not isinstance(work_dirs, list):
        return {}

    mapping: dict[str, str] = {}
    for item in work_dirs:
        if not isinstance(item, dict):
            continue
        path_val = item.get("path")
        if not isinstance(path_val, str) or not path_val.strip():
            continue
        mapping[md5_hex(path_val)] = path_val
    return mapping

