# Data Locations（Kimi Code CLI）

来源：`https://moonshotai.github.io/kimi-cli/en/configuration/data-locations.html`

## 关键结论（用于本项目实时监控）

- 默认共享目录：`~/.kimi/`（Windows 通常对应 `C:\Users\<you>\.kimi\`）
- 可通过环境变量 `KIMI_SHARE_DIR` 自定义共享目录
- 会话数据落地在 `sessions/` 下，核心文件：
  - `wire.jsonl`：Wire 事件流（JSONL），适合作为**实时监控事件源**
  - `context.jsonl`：上下文与用量等（JSONL）
  - `state.json`：会话状态（标题、模式、subagent 等）

## 目录结构（原文摘录）

```
~/.kimi/
├── config.toml           # Main configuration file
├── kimi.json             # Metadata
├── mcp.json              # MCP server configuration
├── credentials/          # OAuth credentials
│   └── <provider>.json
├── sessions/             # Session data
│   └── <work-dir-hash>/
│       └── <session-id>/
│           ├── context.jsonl
│           ├── wire.jsonl
│           └── state.json
├── imported_sessions/    # Imported session data (via kimi vis)
│   └── <session-id>/
│       ├── context.jsonl
│       ├── wire.jsonl
│       └── state.json
├── plans/                # Plan mode plan files
│   └── <slug>.md
├── user-history/         # Input history
│   └── <work-dir-hash>.jsonl
└── logs/                 # Logs
    └── kimi.log
```

> 本项目当前主要读取 `sessions/` 下的数据。`imported_sessions/` 结构类似，但不在实时监控范围内。

## 会话数据（原文摘录）

### `context.jsonl`

Context history file, stores the session's full context in JSON Lines (JSONL) format.

### `wire.jsonl`

Wire message log file, stores Wire events during the session in JSON Lines (JSONL) format. Used for session replay and extracting session titles.

### `state.json`

Session state file, stores the session's runtime state, including title / approval / plan_mode / subagent_instances / additional_dirs etc.
