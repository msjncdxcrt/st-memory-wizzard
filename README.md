<div align="center">

# Memory Wizard · 记忆之术 (TauriTavern)

**TauriTavern 长程记忆扩展 — 分层摘要、记忆树路由召回、上下文融合与 Prompt Cache 锚点**

项目地址：<https://github.com/msjncdxcrt/st-memory-wizzard.git>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 这是什么

Memory Wizard（记忆之术）是面向 TauriTavern 的第三方扩展，为角色提供可持续、可扩展的长程记忆。它不依赖把整段历史塞进上下文，而是把记忆分成几种结构，按需召回、自动总结：

| 功能 | 说明 |
|---|---|
| 记忆树 + 路由召回 | 层级事实库；前快模型按需召回相关节点，支持关键词硬触发、钉死节点和 Token 预算控制。 |
| 分层摘要金字塔 | 楼层 → 日记 → 周记 → 史记 自动融合，长聊天会逐层压缩成可持续注入的记忆块。 |
| 时记实时窗口 | 注入最新未归档楼层，保证近期细节不丢。 |
| 上下文融合沙盒 | 按楼层、正则、关键词、角色、模型、时间等条件筛选历史楼层，手动融合成各层记忆。 |
| AI 缩减 | 把记忆树交给模型整理，批量精简、移动或新增节点，逐条预览采纳。 |
| Prompt Cache 锚点 | 支持 `{{cache_anchor}}` 等宏，用于稳定记忆块的缓存断点。 |
| 场景化连接配置 | 可由前快模型判定教学、剧情、亲密场景，并切换对应连接配置。 |
| 按需补读 / 填树标签 | 主模型可通过 `<recall>路径</recall>` 补读节点，通过 `<record>…</record>` 触发写树。 |

---

## 安装

本仓库目标是成为可直接放入 TauriTavern 的扩展目录使用的扩展包。不要把它安装到 TauriTavern 本体源码里，也不需要安装 Node.js 服务端插件。

1. 获取本仓库：
   ```bash
   git clone https://github.com/msjncdxcrt/st-memory-wizzard.git
   ```
2. 将仓库目录作为扩展放入 TauriTavern 的用户扩展目录，目录名保持为：
   ```text
   st-memory-wizzard
   ```
3. 确认扩展目录根部存在这些文件：
   ```text
   manifest.json
   index.js
   index.css
   settings.html
   tauritavern-backend-shim.js
   ```
4. 在 TauriTavern 中启用扩展支持，然后重启或刷新 TauriTavern。
5. 在顶栏点击 Memory Wizard 图标打开面板。

> 本项目只修改当前扩展仓库，不会自动复制文件到 `C:\Program Tools\TauriTavern`，也不会修改 TauriTavern 本体。

---

## TauriTavern 适配说明

TauriTavern 没有 SillyTavern 的 Node.js 服务端插件运行时，因此本扩展使用 `tauritavern-backend-shim.js` 访问 TauriTavern store API：

| 原后端职责 | TauriTavern 方案 |
|---|---|
| 保存配置 | `store.setJson()` / `store.getJson()` |
| 保存记忆树 | 按聊天 key 写入 TauriTavern KV store |
| 保存共享记忆 | 独立写入 `shared_tree` |
| 保存摘要与沙盒聊天 | 按聊天 key 写入 store |
| 列出备份 | 通过 `store.listKeys()` 列出现有 store key |
| 写日志 | `console.log`，重要状态写入 metadata |
| Node backend / Express endpoints | 不使用 |
| 本地 gateway 进程 | 不作为 TauriTavern 安装要求 |

当前版本的历史快照备份和文件日志能力会退化为 store/metadata 能力；超大的上下文融合沙盒数据可能受 TauriTavern store 单 key 大小限制影响。

---

## 快速开始

1. 打开面板，进入“设置 & 配置”。
2. 为各任务指定 TauriTavern 中可用的连接配置：
   - 回复前·记忆树检索模型
   - 回复后·填记忆树模型
   - 日记 / 周记 / 史记模型
   - AI 缩减模型
3. 在角色卡或预设里写入融合宏，默认使用：
   ```text
   {{memory}}
   ```
4. 正常对话。记忆树检索、填树、摘要归档和上下文融合会按配置运行。
5. 用面板里的运行状态和日志区域检查扩展状态。

---

## 宏参考

所有宏名均可在设置中自定义。

| 宏 | 默认名 | 注入内容 |
|---|---|---|
| 融合记忆 | `{{memory}}` | 按融合变量模板拼出的整段记忆，通常只需要使用这一个。 |
| 记忆树召回 | `{{memory_tree}}` | 本轮路由召回和钉死节点正文。 |
| 记忆树索引 | `{{memory_tree_header}}` | 记忆树路径与提示目录，不含正文。 |
| 史记 | `{{memory_historical}}` | 全部史记正文。 |
| 周记 | `{{memory_weekly}}` | 全部周记正文。 |
| 日记 | `{{memory_daily}}` | 尚未熔炼成周记的日记正文。 |
| 时记 | `{{memory_hourly}}` | 最新未归档楼层。 |
| 上下文 | `{{history}}` | 上下文融合沙盒中当前筛选后的楼层正文。 |
| 全部记 | `{{records}}` | 当前所有未归档的史记、周记、日记。 |
| 缓存锚点 | `{{cache_anchor}}` | 手动缓存模式下的 cache 锚点标记。 |

---

## 已知限制

- 本扩展不再依赖 `backend/index.mjs`，也不需要旧版服务端插件开关。
- `gateway/` 不作为 TauriTavern 版本的安装要求。
- 历史快照备份没有完全等价的文件系统实现，当前以 TauriTavern store key 为准。
- 日志不再写入 `wizzard.log` 文件，主要通过控制台和 metadata 保存。
- 如果沙盒聊天很大，可能需要后续改为分片存储或只保存元数据。

---

## 常见问题

**Q：为什么不需要安装服务端插件？**

A：TauriTavern 没有 SillyTavern 的 Node.js 服务端插件运行时。本版本通过 `tauritavern-backend-shim.js` 直接调用 TauriTavern store API 保存数据。

**Q：能不能把仓库直接放进 TauriTavern 本体目录？**

A：不要改 TauriTavern 本体。把本仓库作为用户扩展放到 TauriTavern 的扩展目录即可。

**Q：旧的 gateway 还能用吗？**

A：TauriTavern 版本不把 gateway 作为安装要求。缓存锚点相关能力以 TauriTavern 自身 Claude 请求链路和本扩展的宏处理为准。

---

## 许可证

[MIT](LICENSE) © 2026 Shawn
