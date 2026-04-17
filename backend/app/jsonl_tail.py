from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncIterator, Optional


@dataclass
class TailState:
    offset: int = 0
    partial: str = ""


def _split_complete_lines(buffer: str) -> tuple[list[str], str]:
    # Normalize newlines; JSONL is line-oriented.
    parts = buffer.splitlines(keepends=True)
    complete: list[str] = []
    carry = ""
    for p in parts:
        if p.endswith("\n") or p.endswith("\r\n"):
            complete.append(p.rstrip("\r\n"))
        else:
            carry += p
    return complete, carry


async def tail_jsonl(
    path: Path,
    *,
    poll_interval_s: float = 1.0,
    state: Optional[TailState] = None,
) -> AsyncIterator[dict]:
    """
    Incrementally read appended JSONL objects from a file.
    - Uses byte offset to avoid re-reading.
    - Buffers partial line until newline is written.
    """
    st = state or TailState()
    while True:
        try:
            if not path.exists():
                await asyncio.sleep(poll_interval_s)
                continue

            size = path.stat().st_size
            if size < st.offset:
                # File rotated/truncated
                st.offset = 0
                st.partial = ""

            if size == st.offset:
                await asyncio.sleep(poll_interval_s)
                continue

            with path.open("rb") as f:
                f.seek(st.offset)
                chunk = f.read()
                st.offset = f.tell()

            if not chunk:
                await asyncio.sleep(poll_interval_s)
                continue

            text = chunk.decode("utf-8", errors="replace")
            buf = st.partial + text
            lines, carry = _split_complete_lines(buf)
            st.partial = carry

            for line in lines:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    # Skip malformed line rather than killing the stream.
                    continue
                if isinstance(obj, dict):
                    yield obj
        except asyncio.CancelledError:
            raise
        except Exception:
            await asyncio.sleep(poll_interval_s)


def read_jsonl_since(path: Path, *, since_offset: int = 0) -> tuple[list[dict], int]:
    """
    Read appended JSONL objects starting from byte offset.
    Returns (objects, next_offset).
    Incomplete last line is ignored and offset is rewound to before it.
    """
    if not path.exists():
        return [], 0

    file_size = path.stat().st_size
    offset = max(0, min(since_offset, file_size))

    with path.open("rb") as f:
        f.seek(offset)
        chunk = f.read()
        next_offset = f.tell()

    if not chunk:
        return [], offset

    text = chunk.decode("utf-8", errors="replace")
    lines = text.splitlines(keepends=True)
    complete_lines: list[str] = []
    consumed_bytes = 0
    for raw_line in lines:
        raw_line_bytes = raw_line.encode("utf-8", errors="replace")
        if raw_line.endswith("\n") or raw_line.endswith("\r\n"):
            consumed_bytes += len(raw_line_bytes)
            complete_lines.append(raw_line.rstrip("\r\n"))
        else:
            # stop at partial line
            break

    objects: list[dict] = []
    for line in complete_lines:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        if isinstance(obj, dict):
            objects.append(obj)

    return objects, offset + consumed_bytes

