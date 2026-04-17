# Environment Variables（Kimi Code CLI）

来源：`https://moonshotai.github.io/kimi-cli/en/configuration/env-vars.html`

## 与本项目强相关

### `KIMI_SHARE_DIR`

- 用途：自定义 Kimi Code CLI 的共享目录（默认 `~/.kimi`）
- 影响：配置、sessions、logs 等运行时数据的存储位置都会跟着变
- 备注：不影响 Agent Skills 的搜索路径
- **本项目应用**：监控面板后端通过该环境变量（或默认值）定位 `sessions/` 目录

原文片段：

> Customize the share directory path for Kimi Code CLI. The default path is `~/.kimi`, where configuration, sessions, logs, and other runtime data are stored.

## 其余环境变量（摘录）

- `KIMI_BASE_URL` / `KIMI_API_KEY` / `KIMI_MODEL_NAME` 等：与模型/Provider 配置覆盖相关
- `KIMI_CLI_NO_AUTO_UPDATE`：禁用更新相关功能
- 粘贴折叠阈值：`KIMI_CLI_PASTE_CHAR_THRESHOLD`、`KIMI_CLI_PASTE_LINE_THRESHOLD`
