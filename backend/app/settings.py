from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    kimi_share_dir: Path


def get_settings() -> Settings:
    share_dir = os.environ.get("KIMI_SHARE_DIR")
    if share_dir:
        base = Path(share_dir).expanduser()
    else:
        base = Path.home() / ".kimi"
    return Settings(kimi_share_dir=base)

