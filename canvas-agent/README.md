# Canvas Agent

本地服务把画布工具通过 MCP 暴露给外部 Agent（如 opcteam）。工具定义、节点操作和生成流程继续使用网页现有实现。

## 启动

安装 Node.js 22+ 后，在终端执行，npx 会从 npm 获取服务及依赖：

```sh
npx -y @ovozoe/canvas-agent@latest
```

首次启动自动生成 Token，保存在当前用户的 `~/.bytebroad-canvas/codex-agent.json`；下次启动复用。终端显示 `Local URL` 和 `Connect token`，默认地址为 `http://127.0.0.1:3210`。网页与服务在同一台电脑运行，不需要克隆仓库或手工创建 `.env`；正确 Token 连接后自动记录网站来源。

## 用 opcteam 连接

先启动上面的本地服务，并在网页里打开并连接画布，然后在 opcteam 中注册 MCP server：

```sh
opcteam mcp add bytebroad-canvas -- npx -y @ovozoe/canvas-agent@latest mcp
```

注册后，opcteam 即可通过 `bytebroad-canvas` 这套 MCP 工具读写画布。查看已注册 server：`opcteam mcp list`；移除：`opcteam mcp remove bytebroad-canvas`。

## 本机配置与范围

`npx -y @ovozoe/canvas-agent@latest config` 输出 `{url, token, origins}`，首次尚未启动时会提示先启动服务。HTTP `GET /config` 只返回 `{url, hasToken}`；Token 和包含它的连接链接不要分享。

`CANVAS_AGENT_TOKEN`、`CANVAS_AGENT_PORT`、`CANVAS_AGENT_ORIGINS` 可选环境变量覆盖 Token、端口和预置来源；更改后重启服务。通常无需设置。

外部 MCP 默认只操作唯一已连接的画布；多个画布连接时，通过 MCP 环境变量 `CANVAS_AGENT_CLIENT_ID` 明确目标。断开连接会结束对应会话，已提交的生成任务仍由现有画布流程处理。
