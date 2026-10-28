# dsh-fish-chat

把「蓝色大肥鱼」桌宠双击输入框里发来的消息，注入当前 DSH 会话，让鱼鱼能和你正在用的 Agent 对话。

## 工作方式

1. 以子进程方式启动大肥鱼的 MCP 桥 `bigbluefish-mcp`
2. 监听它的 `notifications/message`（`logger = bigbluefish.interaction`、`kind = user_message`）
3. 取出 `detail.text`，通过 `agents.roots()[0].followup(...)` 以用户消息注入当前会话
4. 用 `sequence` 去重；每次重新初始化时把 `lastSequence` 归零

## 配置

桥接程序路径优先取环境变量 `BIGBLUEFISH_MCP`，未设置时回退到
`$HOME/Documents/big-blue-fish-src/dist/mcp/bigbluefish-mcp`。

```sh
export BIGBLUEFISH_MCP=/path/to/bigbluefish-mcp
```

## 安装

```sh
cp -R dsh-fish-chat ~/.dsh/profiles/<profile>/node_modules/
```

把 `dsh-fish-chat` 加入 profile 的 `dsh.profile.bundles`，重启 DSH。

## License

MIT
