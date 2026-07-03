# TauriTavern 专用改造清单

> 本清单只描述把当前仓库改成 TauriTavern 可安装扩展需要处理的事项。不保留 SillyTavern fallback 方案，不修改 TauriTavern 本体，不上传。

## PATCH-0：清单入口

`manifest.json` 是安装入口，需改为 TauriTavern 版：

```json
{
  "display_name": "Memory Wizard (TauriTavern)",
  "loading_order": 100,
  "requires": [],
  "optional": [],
  "js": "index.js",
  "css": "index.css",
  "author": "Shawn (ported to TauriTavern by gu)",
  "version": "1.0.1-tt",
  "homePage": "https://github.com/msjncdxcrt/st-memory-wizzard.git",
  "auto_update": false,
  "minimum_client_version": "1.18.0",
  "notes": "TauriTavern port: backend replaced with window.__TAURITAVERN__.api.chat.store.*. Gateway removed."
}
```

`manifest.tauritavern.json` 保留同内容，作为 TT 专用清单备份。

## PATCH-1：README

README 改为 TauriTavern 专用说明：

- 标题写明 `Memory Wizard (TauriTavern)`。
- 仓库地址写为 `https://github.com/msjncdxcrt/st-memory-wizzard.git`。
- 安装说明只描述把仓库目录作为扩展放入 TauriTavern 用户扩展目录。
- 删除旧版服务端插件安装步骤。
- 删除服务端插件开关要求。
- 删除本地网关启动教程，只保留“TT 版不把本地网关作为安装要求”的限制说明。
- 明确不会修改 `C:\Program Tools\TauriTavern`。

## PATCH-2：迁移计划文档

`tauritavern-migration-plan.md` 改为当前 TT 可安装扩展的说明，重点是：

- 当前仓库是扩展包，不是 TauriTavern 本体补丁。
- `C:\Program Tools\TauriTavern` 只作为目标平台参考。
- 数据持久化通过 `tauritavern-backend-shim.js` 调用 TauriTavern store API。
- 历史快照、文件日志、gateway 属于已知限制或非安装要求。

## PATCH-3：代码迁移待办

当前文档与清单先收口为 TT 专用。后续如果继续做代码层完整迁移，应处理 `index.js` 中仍残留的 backend 调用：

| 调用 | TT 处理 |
|---|---|
| `/get-config` | `STORE.getConfig()` |
| `/save-config` | `STORE.saveConfig(config)` |
| `/get-tree` | `STORE.getTree(activeChatId)` |
| `/save-tree` | `STORE.saveTree(activeChatId, personal)` |
| `/get-shared-tree` | `STORE.getSharedTree()` |
| `/save-shared-tree` | `STORE.saveSharedTree(shared)` |
| `/get-summaries` | `STORE.getSummaries(activeChatId)` |
| `/save-summaries` | `STORE.saveSummaries(activeChatId, summaries)` |
| `/get-sandbox-chat` | `STORE.getSandboxChat(activeChatId)` |
| `/save-sandbox-chat` | `STORE.saveSandboxChat(activeChatId, sandboxChatContext)` |
| `/migrate-key` | `STORE.migrateKey(legacyChatId, newChatId)` |
| `/list-backups` | `STORE.listBackups(kind)` |
| `/read-backup` | `STORE.readBackup(kind, name)` |
| `/log` | `STORE.writeLog(message, level)` |
| `/gateway/start` | 移除或隐藏 |
| `/backfill-realtime` | 前端本地计算或补 shim 方法 |

## PATCH-4：禁止事项

- 不保留“否则回退到 SillyTavern fetch”的实现口径。
- 不把旧 backend 安装写入 README。
- 不运行复制命令安装到 `C:\Program Tools\TauriTavern`。
- 不提交、不推送、不上传。

## PATCH-5：验收

- 搜索旧仓库地址，不应再出现在 README 或清单里。
- 搜索服务端插件开关名，不应再作为安装要求出现。
- 搜索旧插件安装路径，不应再作为安装步骤出现。
- 搜索本地网关启动脚本，不应再作为 TT 安装步骤出现。
