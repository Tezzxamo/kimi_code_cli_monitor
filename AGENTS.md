# AGENTS.md — Kimi Code CLI 实时监控面板

> 本文件面向 AI Coding Agent。如果你刚拿到这个项目且对它一无所知，请优先阅读本文档。

---

## 免责声明

- 本项目是**非官方**的第三方开源工具，与 **月之暗面（Moonshot AI）** 及其产品 **Kimi Code CLI** 无任何关联、背书或赞助关系。
- "Kimi" 是 Moonshot AI 的注册商标。
- 本项目仅读取用户本地计算机上的日志文件，不上传任何数据到外部服务器。

---

## 项目概述

本项目是一个**本地 Web 监控面板**，用于实时观察 Kimi Code CLI 的会话进展。

- **核心目标**：以 1–5 秒延迟展示 `wire.jsonl` 中的增量事件。
- **架构**：Python（FastAPI）后端 + React + TypeScript（Vite）前端。
- **核心机制**：后端持续扫描 `~/.kimi/sessions/` 目录，增量读取 `wire.jsonl`，并通过 SSE / 轮询接口将事件推送给前端展示。

### 背景

Kimi Code CLI 在运行时会将会话事件写入本地 `~/.kimi/sessions/**/wire.jsonl`。官方提供了 `kimi vis` 命令用于离线/回放式查看 trace，但缺乏一个**低延迟的实时监控面板**。本项目即是为了填补这一空白。

---

## 功能边界

### 必须实现

1. **会话发现**
   - 扫描 `~/.kimi/sessions/<work-dir-hash>/<session-id>/` 目录结构；
   - 解析 `state.json` 获取会话标题；
   - 读取 `~/.kimi/kimi.json` 将 `work_dir_hash` 映射为真实路径。

2. **增量事件读取**
   - 基于 byte offset 增量读取 `wire.jsonl`；
   - 支持文件轮转（大小变小则重置 offset）；
   - 处理半行缓冲，不丢事件、不重复。

3. **实时推送**
   - 后端提供 SSE 接口 `/api/stream`；
   - 同时提供轮询接口 `/api/events`（前端当前使用此方案）。

4. **前端展示**
   - 会话侧边栏（树状 / 列表、搜索、折叠）；
   - 事件时间线（类型标签、摘要、关键字段、完整 JSON 展开）；
   - 分页控制（避免一次渲染过多 DOM 节点）。

5. **统计概览**
   - 全局维度统计：总会话数、总 Turn 数、总 Token 消耗、总耗时；
   - 近 30 日每日 Sessions / Turns 趋势折线图；
   - Top 20 工具调用及错误率条形图；
   - Top 20 项目（按 Turn 数排序）。

6. **主题与体验**
   - 浅色 / 深色模式切换；
   - 主题偏好持久化到 `localStorage`。

### 不实现（当前版本）

- 用户鉴权与登录；
- 远程部署与 Docker 化；
- 对 `context.jsonl` 的深入解析与展示；
- 历史会话的回放/快进；
- 自动化测试（pytest / vitest）。

---

## 开发进度

- [x] 梳理并本地化 Kimi Code CLI 关键文档到 `docs/`（数据落地、env vars、`kimi` 命令、`kimi vis`）
- [x] 创建项目目录结构与顶层说明（`backend/`、`frontend/`、`docs/`、`README.md`）
- [x] Python 后端骨架（FastAPI）：会话发现、`wire.jsonl` 增量读取、SSE 推送
- [x] 前端骨架（Web）：会话选择、实时事件流展示
- [x] 本地运行方式说明（后端/前端分别如何启动）
- [x] 工作目录聚合接口 `GET /api/work-dirs`
- [x] 前端侧边栏：树状视图 / 列表视图切换、搜索、折叠
- [x] 浅色 / 深色主题切换与 `localStorage` 持久化
- [x] 事件时间线分页（10/20/50/100 条/页）、字段提取、JSON 展开
- [x] 全局统计面板（总览、近 30 日趋势、工具调用、项目排行）
- [x] 提供前后端一键同时启动脚本 `start-all.ps1`
- [x] 更新全部项目文档（README、AGENTS、docs 交叉引用）
- [x] Session 列表右键菜单：重命名（修改 `state.json` 标题）、删除（移除会话目录）

---

## 目录结构

```
.
├── backend/          # FastAPI 后端
│   ├── app/          # 业务代码
│   │   ├── main.py           # FastAPI 路由与入口
│   │   ├── kimi_sessions.py  # 会话发现与路径解析
│   │   ├── jsonl_tail.py     # 增量 JSONL 读取（带 byte offset）
│   │   ├── settings.py       # 配置（KIMI_SHARE_DIR 等）
│   │   └── __init__.py
│   ├── requirements.txt      # Python 依赖
│   ├── run.ps1               # 简单启动 uvicorn
│   ├── start.ps1             # 一键启动（自动创建 venv、检查依赖）
│   └── .venv/                # Python 虚拟环境（由 start.ps1 自动管理）
├── frontend/         # Web 前端
│   ├── src/
│   │   ├── main.tsx          # React 应用挂载点
│   │   ├── types/            # TypeScript 类型定义
│   │   ├── hooks/            # 自定义 React Hooks
│   │   ├── utils/            # 工具函数
│   │   ├── components/       # UI 组件
│   │   │   ├── Sidebar.tsx         # 会话侧边栏（树状/列表、搜索、右键菜单）
│   │   │   ├── EventCard.tsx       # 单条事件卡片
│   │   │   ├── EventTreeNode.tsx   # 事件 JSON 树形展示
│   │   │   ├── StatisticsPanel.tsx # 统计面板
│   │   │   └── ...
│   │   └── ui/
│   │       └── App.tsx       # 主应用逻辑（路由、状态、SSE 连接）
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts        # Vite 配置（含 /api 代理）
│   ├── tsconfig.json
│   └── run.ps1               # 前端本地启动脚本（npm install + dev）
├── docs/             # Kimi CLI 离线文档整理
│   ├── kimi-cli-data-locations.md
│   ├── kimi-cli-env-vars.md
│   ├── kimi-cli-kimi-command.md
│   └── kimi-cli-kimi-vis.md
├── start-all.ps1     # 开发模式：前后端一键同时启动
└── README.md
```

---

## 技术栈

### 后端
- **Python 3**（项目当前使用 Python 3.14 虚拟环境）
- **FastAPI** — Web 框架与路由
- **Uvicorn** — ASGI 服务器（带 `--reload` 热重载）
- **Pydantic** — 数据校验（通过 FastAPI 间接使用）

### 前端
- **React 19** + **React DOM**
- **TypeScript 5.6**（严格模式）
- **Vite 6**（开发服务器 + 构建）
- **ESLint 9** + `eslint-plugin-react-hooks`

### 运行环境
- 当前开发环境为 **Windows**，启动脚本使用 **PowerShell**（`.ps1`）。
- 后端默认监听 `http://127.0.0.1:8787`。
- 前端默认监听 `http://127.0.0.1:5173`，并在 `vite.config.ts` 中代理 `/api` 到后端。

---

## 构建与运行命令

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

浏览器访问 Vite 输出的地址（默认 `http://127.0.0.1:5173`）。

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

### 前端构建（生产静态包）

```powershell
cd frontend
npm run build
```

构建产物输出到 `frontend/dist/`。

---

## 后端 API 一览

| 接口 | 说明 |
|------|------|
| `GET /api/health` | 健康检查 |
| `GET /api/sessions?page=1&page_size=10&work_dir_contains=xxx` | 会话列表（分页 + 工作目录过滤） |
| `PUT /api/sessions/{session_id}` | 重命名会话（Body: `{"title": "..."}`） |
| `DELETE /api/sessions/{session_id}` | 删除会话及目录 |
| `GET /api/work-dirs?limit=200` | 工作目录聚合统计 |
| `GET /api/statistics` | 全量统计摘要（会话/Turn/Token/工具/项目 Top 20） |
| `GET /api/stream?session_id=<id>&poll_interval_s=1&since_offset=0` | **SSE** 流式推送 `wire.jsonl` 增量事件 |
| `GET /api/events?session_id=<id>&since_offset=0` | 一次性轮询 `wire.jsonl` 增量事件 |

> 注：当前前端实现使用的是 `/api/events` 轮询（每 5 秒一次），但后端已完整实现 `/api/stream` SSE 接口，可随时切换。

---

## 代码组织与模块职责

### 后端模块

- **`app/main.py`**
  - FastAPI 实例创建、CORS 中间件、全部 REST / SSE 路由；
  - 若检测到 `frontend/dist` 目录，则自动挂载 `StaticFiles` 以支持单服务部署模式。
- **`app/kimi_sessions.py`**
  - 扫描 `~/.kimi/sessions/<work-dir-hash>/<session-id>/` 目录结构；
  - 解析 `state.json` 获取会话标题；
  - 读取 `~/.kimi/kimi.json` 建立 `work_dir_hash -> work_dir_path` 映射。
- **`app/jsonl_tail.py`**
  - `tail_jsonl()`：异步生成器，按 byte offset 增量读取 `wire.jsonl`，处理文件轮转与半行缓冲；
  - `read_jsonl_since()`：同步一次性读取指定 offset 之后的内容。
- **`app/settings.py`**
  - `Settings` frozen dataclass；
  - 默认共享目录 `~/.kimi`，可通过环境变量 `KIMI_SHARE_DIR` 覆盖。

### 前端模块

- **`src/main.tsx`**
  - React 根组件挂载，引入 `React.StrictMode`。
- **`src/ui/App.tsx`**
  - 主应用容器：
    - 全局状态管理（sessions、events、SSE 连接、分页过滤）；
    - 主内容区（事件时间线、JSON 详情、分页、状态栏）；
    - 统计视图（总览卡片、近 30 日折线图、工具调用、项目排行）；
    - 轮询逻辑（`/api/events` 每 5 秒拉取，`/api/statistics` 每 30 秒拉取）；
    - 浅色/深色主题持久化到 `localStorage`。
- **`src/components/Sidebar.tsx`**
  - 会话侧边栏：
    - 树状/列表视图切换、搜索过滤、排序、目录折叠；
    - 右键上下文菜单（重命名、删除）；
    - 内联标题编辑（Enter 确认 / Escape 取消）。

---

## 代码风格与约定

- **语言**：项目注释、文档、UI 文案均以**中文**为主。
- **Python**：
  - 文件头常带 `from __future__ import annotations`；
  - 使用 `pathlib.Path` 处理路径；
  - 类型提示完整，返回 `Optional[...]`、`Iterable[...]` 等。
- **TypeScript / React**：
  - `tsconfig.json` 启用 `strict: true`；
  - 不使用外部 UI/CSS 库，全部样式为**内联 `style`**，通过 `COLORS[theme]` 统一调色；
  - Hook 命名规范：`useTheme` 等。
- **脚本**：Windows 环境优先提供 `.ps1` 启动脚本。

---

## 测试策略

目前项目中**未包含自动化测试**（无 pytest、无 Jest / Vitest）。

若后续添加测试，建议按以下方向：
- **后端**：用 `fastapi.testclient.TestClient` 测试 API 路由；为 `jsonl_tail.py` 编写临时文件 fixture 测试增量读取逻辑。
- **前端**：可引入 `vitest` + `@testing-library/react` 测试组件渲染与状态切换。

---

## 部署说明

本项目当前定位为**本地开发辅助工具**，尚未配置 Docker、CI/CD 或云端部署脚本。

如需简单部署：
1. 后端可用任意支持 ASGI 的服务器（Uvicorn / Gunicorn + Uvicorn Workers）托管；
2. 前端 `npm run build` 后得到静态文件，可用 Nginx / Caddy 等托管；
3. 生产环境请务必修改 `backend/app/main.py` 中的 CORS `allow_origins=["*"]`，限制为实际域名。

---

## 安全注意事项

- **CORS**：后端当前设置为 `allow_origins=["*"]`，仅适合本地开发。
- **路径遍历**：后端读取的文件严格限制在 `KIMI_SHARE_DIR`（默认 `~/.kimi`）下，不直接暴露任意文件系统访问。
- **敏感信息**：`wire.jsonl` 中可能包含模型交互内容，请勿在公共网络无鉴权暴露此面板。

---

## 可配置项

- `KIMI_SHARE_DIR`：覆盖默认的 `~/.kimi` 共享目录路径。

---

## 相关文档

- `README.md` — 项目简介与离线文档索引
- `docs/*.md` — Kimi Code CLI 官方文档的本地化整理（数据目录、环境变量、命令参考、`kimi vis`）
