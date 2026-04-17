# Kimi Code CLI 实时监控面板（Web）

> **免责声明**：本项目是**非官方**的第三方开源工具，与月之暗面（Moonshot AI）及其产品 Kimi Code CLI **无任何关联、背书或赞助关系**。"Kimi" 是 Moonshot AI 的注册商标。
>
> 若你在 GitHub 上浏览本仓库，建议在仓库 About 中填写：*A local web dashboard for Kimi Code CLI sessions (unofficial)*。

本项目是一个**本地 Web 监控面板**，用于以 1–5 秒延迟实时观察 Kimi Code CLI 的会话进展。

## 核心特性

- **实时事件流**：通过轮询 `/api/events` 每 5 秒增量读取 `wire.jsonl`，后端同时提供 `/api/stream` SSE 接口。
- **会话管理**：侧边栏支持**树状视图**（按工作目录分组）与**列表视图**，支持搜索、折叠。
- **工作目录聚合**：`GET /api/work-dirs` 接口统计各目录下的会话数量与最新更新时间。
- **主题切换**：内置浅色 / 深色模式，偏好持久化到 `localStorage`。
- **事件时间线**：展示事件类型、摘要、关键字段提取，支持展开查看完整 JSON。
- **分页浏览**：时间线支持每页 10/20/50/100 条分页，避免大量事件卡顿。
- **统计概览**：全局统计面板展示总会话数、Turn 数、Token 消耗、近 30 日每日用量折线图、Top 20 工具调用及错误率、Top 20 项目活跃度。
- **零外部 CSS 依赖**：全部样式为内联 `style`，通过统一调色对象 `COLORS` 维护。

## 技术栈

- **后端**：Python 3 + FastAPI + Uvicorn
- **前端**：React 19 + TypeScript 5.6 + Vite 6
- **平台**：Windows（提供 PowerShell 一键启动脚本）

## 目录结构

```
.
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── main.py           # 路由入口
│   │   ├── kimi_sessions.py  # 会话发现与路径解析
│   │   ├── jsonl_tail.py     # 增量 JSONL 读取（带 byte offset）
│   │   ├── settings.py       # 配置
│   │   └── __init__.py
│   ├── requirements.txt
│   ├── run.ps1               # 直接启动 uvicorn
│   └── start.ps1             # 一键启动（自动 venv + 依赖检查）
├── frontend/         # React + Vite 前端
│   ├── src/
│   │   ├── main.tsx
│   │   └── ui/
│   │       └── App.tsx       # 全部 UI 逻辑
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts        # 含 /api 代理
│   └── run.ps1               # 前端启动脚本
├── docs/             # Kimi CLI 离线文档整理
│   ├── kimi-cli-data-locations.md
│   ├── kimi-cli-env-vars.md
│   ├── kimi-cli-kimi-command.md
│   └── kimi-cli-kimi-vis.md
├── start-all.ps1     # 开发模式：前后端一键同时启动
└── README.md
```

## 启动方式

### 开发模式（热重载）

开发时推荐同时启动前后端，各自享有热重载：

```powershell
.\start-all.ps1
```

该脚本会自动打开两个新 PowerShell 窗口，分别启动后端 (`http://127.0.0.1:8787`) 和前端 (`http://127.0.0.1:5173`)。关闭对应窗口即可停止服务。

也可以手动分别启动：

```powershell
# 后端
cd backend
.\start.ps1

# 前端（另一个窗口）
cd frontend
npm install
npm run dev
```

### 部署模式（单服务）

部署时只需启动后端，由后端托管前端构建产物：

```powershell
cd frontend
npm install
npm run build

cd ..\backend
.\start.ps1
```

然后直接访问后端的地址即可（默认 `http://127.0.0.1:8787`）。

> 原理：`main.py` 会在 `frontend/dist` 存在时自动通过 `StaticFiles` 挂载构建产物，API 路由 (`/api/*`) 不受影响。

## 后端 API 一览

| 接口 | 说明 |
|------|------|
| `GET /api/health` | 健康检查 |
| `GET /api/sessions?page=1&page_size=10&work_dir_contains=xxx` | 会话列表（分页 + 过滤） |
| `GET /api/work-dirs?limit=200` | 工作目录聚合统计 |
| `GET /api/statistics` | 全量统计摘要（会话/Turn/Token/工具/项目 Top 20） |
| `GET /api/stream?session_id=<id>&poll_interval_s=1&since_offset=0` | **SSE** 流式推送增量事件 |
| `GET /api/events?session_id=<id>&since_offset=0` | 一次性轮询增量事件 |

## 相关文档

- `AGENTS.md` — 项目全貌：需求边界、开发进度、代码组织、运行方式、安全事项
- `docs/*.md` — Kimi Code CLI 官方文档的本地化整理

## 安全提示

- 后端 CORS 当前设置为 `allow_origins=["*"]`，**仅适合本地开发**。
- `wire.jsonl` 中可能包含模型交互内容，请勿在公共网络无鉴权暴露此面板。
