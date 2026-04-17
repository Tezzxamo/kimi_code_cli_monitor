# 后端（FastAPI）

职责：
- 发现 Kimi Code CLI sessions（`~/.kimi/sessions/**`，支持 `KIMI_SHARE_DIR`）
- 增量读取 `wire.jsonl`（JSONL tail，容忍半行写入）
- 通过 SSE（Server-Sent Events）推送给前端

## 一键启动

在 `backend/` 目录执行：

```powershell
.\start.ps1
```

可选参数：

```powershell
.\start.ps1 -HostAddress 0.0.0.0 -Port 8787
```

脚本会自动：
- 创建 `.venv`（若不存在）
- 安装/更新 `requirements.txt` 依赖
- 启动 FastAPI（uvicorn + reload）

