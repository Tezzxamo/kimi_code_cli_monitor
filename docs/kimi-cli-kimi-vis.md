# Agent Tracing Visualizer（`kimi vis`）

来源：`https://moonshotai.github.io/kimi-cli/en/reference/kimi-vis.html`

## 摘要

`kimi vis` 提供浏览器可视化面板，用于查看会话 trace（Wire event timeline、上下文、历史会话、Token 统计等）。目前为 Technical Preview。

## 启动方式（原文摘录）

```sh
kimi vis
```

- 默认地址：`http://127.0.0.1:5495`
- 端口占用时会在 `5495–5504` 范围自动顺延

## CLI 选项（摘录）

- `--host/-h`：绑定指定地址
- `--network/-n`：绑定 `0.0.0.0` 并显示局域网 IP
- `--port/-p`：指定端口
- `--open/--no-open`：是否自动打开浏览器
- `--reload`：开发模式自动重载

## 与本项目的关系

`kimi vis` 是“离线/回放 + 历史浏览”为主的 trace 可视化，默认端口 `5495`。

本项目是“1–5 秒延迟的实时监控页”，默认端口 `5173`（前端）+ `8787`（后端），直接读取 `~/.kimi/sessions/**/wire.jsonl` 做增量推送，实现实时面板。
