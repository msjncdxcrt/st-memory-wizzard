# Memory Wizard → TauriTavern 可安装扩展改造计划

> 目标：当前仓库自身成为 TauriTavern 下可安装的第三方扩展。`C:\Program Tools\TauriTavern` 仅作为本机目标平台参考，不修改 TauriTavern 本体，不复制、不上传。

## 一、项目定位

Memory Wizard 原本来自 SillyTavern 扩展生态，旧版依赖两个部分：

| 旧组件 | 技术 | TauriTavern 处理 |
|---|---|---|
| 前端扩展 | 浏览器 JS/CSS/HTML | 保留 |
| Node.js 服务端插件 | Express + fs | 不使用 |
| 本地 gateway | Node.js 反向代理 | 不作为安装要求 |

TauriTavern 没有 SillyTavern 的 Node.js 服务端插件运行时，因此当前仓库改为 TauriTavern 专用扩展包：前端直接调用 `tauritavern-backend-shim.js`，由 shim 使用 TauriTavern store API 保存配置、记忆树、摘要和沙盒数据。

## 二、仓库与清单

项目地址统一为：

```text
https://github.com/msjncdxcrt/st-memory-wizzard.git
```

安装入口以 `manifest.json` 为准；`manifest.tauritavern.json` 保留为同内容的 TT 专用清单备份。两个清单都应声明：

- `display_name`: `Memory Wizard (TauriTavern)`
- `js`: `index.js`
- `css`: `index.css`
- `homePage`: `https://github.com/msjncdxcrt/st-memory-wizzard.git`
- `auto_update`: `false`
- `minimum_client_version`: `1.18.0`

## 三、安装边界

本项目只修改当前仓库文件，不做以下操作：

- 不修改 `C:\Program Tools\TauriTavern`
- 不复制扩展到 TauriTavern 用户目录
- 不提交 git
- 不推送或上传

README 只说明安装方式，由使用者自行把仓库目录放入 TauriTavern 的用户扩展目录。

## 四、运行架构

```text
index.js / settings.html / index.css
        │
        ▼
tauritavern-backend-shim.js
        │
        ▼
window.__TAURITAVERN__.api.chat.store / metadata
```

关键变化：

| 旧能力 | TT 扩展方案 |
|---|---|
| `backend/index.mjs` 写文件 | `store.setJson()` / `store.getJson()` |
| Express API endpoint | 前端直接调用 shim 方法 |
| `Backups/*.json` 文件 | store key |
| `wizzard.log` 文件 | console + metadata |
| gateway 启停 | 不作为 TT 扩展能力 |

## 五、当前 shim API 映射

| 原端点 | Shim 方法 | Store key |
|---|---|---|
| `/get-config` | `STORE.getConfig()` | `config` |
| `/save-config` | `STORE.saveConfig(config)` | `config` |
| `/get-tree` | `STORE.getTree(chatId)` | `tree_{safeId}` |
| `/save-tree` | `STORE.saveTree(chatId, tree)` | `tree_{safeId}` |
| `/get-shared-tree` | `STORE.getSharedTree()` | `shared_tree` |
| `/save-shared-tree` | `STORE.saveSharedTree(tree)` | `shared_tree` |
| `/get-summaries` | `STORE.getSummaries(chatId)` | `sum_{safeId}` |
| `/save-summaries` | `STORE.saveSummaries(chatId, summaries)` | `sum_{safeId}` |
| `/get-sandbox-chat` | `STORE.getSandboxChat(chatId)` | `sandbox_{safeId}` |
| `/save-sandbox-chat` | `STORE.saveSandboxChat(chatId, chat)` | `sandbox_{safeId}` |
| `/migrate-key` | `STORE.migrateKey(from, to)` | 多 key 复制 |
| `/list-backups` | `STORE.listBackups(kind)` | `store.listKeys()` |
| `/read-backup` | `STORE.readBackup(kind, name)` | 按 key 读取 |
| `/log` | `STORE.writeLog(message, level)` | console + metadata |

## 六、文档口径

README 必须表达为 TauriTavern 专用：

- 不再要求安装 `backend/index.mjs`
- 不再要求旧版服务端插件开关
- 不再把 `gateway/` 作为安装步骤
- 明确本仓库不修改 TauriTavern 本体
- 明确仓库地址为 `https://github.com/msjncdxcrt/st-memory-wizzard.git`

## 七、已知限制

| 风险 | 说明 | 后续方向 |
|---|---|---|
| store 单 key 大小 | 沙盒聊天可能很大 | 需要实测；必要时分片存储 |
| 历史快照备份 | 没有文件系统 history 目录 | 当前只列 store key |
| 文件日志 | 不再写 `wizzard.log` | 通过 console/metadata 查看 |
| gateway 模式 | TT 版不启动 Node gateway | 依赖 TauriTavern 自身请求链路 |

## 八、验证清单

- `manifest.json` 和 `manifest.tauritavern.json` 的 `homePage` 均为新仓库地址。
- README 不再包含旧的 SillyTavern 服务端插件安装步骤。
- README 不再要求修改 `C:\Program Tools\TauriTavern`。
- 文档中只把 TauriTavern 本体路径作为目标平台参考，不作为自动修改对象。
- 后续如继续做代码迁移，再逐项替换 `index.js` 中仍残留的 backend fetch 调用。
