# `kimi` Command（Kimi Code CLI）

来源：`https://www.kimi-cli.com/en/reference/kimi-command.html`

## 与本项目强相关选项（摘录整理）

- `--verbose`：输出更详细的运行时信息
- `--debug`：输出调试日志到 `~/.kimi/logs/kimi.log`
- `--work-dir, -w`：指定工作目录（会影响 session 分组）
- `--continue, -C`：继续当前工作目录上一次会话
- `--session/--resume`：恢复指定会话

## UI/模式相关（可能作为后续扩展）

- `--print`：非交互打印模式（可用 `stream-json` 做程序化集成）
- `--wire`：Wire server mode（实验性）

> 注：本项目的 MVP 会优先以 `~/.kimi/sessions/**/wire.jsonl` 作为实时事件源（旁路读取），不要求 CLI 以特殊模式运行。
