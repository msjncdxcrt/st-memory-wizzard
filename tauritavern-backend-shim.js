// tauritavern-backend-shim.js — Memory Wizard TauriTavern 后端适配层
//
// 本文件创建 window.STORE 对象，封装 TauriTavern store API 的所有调用，
// 替代原 SillyTavern 版中所有 fetch('/api/plugins/st-memory-wizzard/...') 后端请求。
// 必须在 index.js 之前加载（manifest.json js 数组中排第一）。
//
// 使用方式：window.STORE.getConfig() / saveConfig() / getTree() 等。
//
// ══ 存储设计 ═══════════════════════════════════════════════════════
// 统一使用 api.extension.store（全局/扩展级存储）。原因：
// - api.chat.store 随当前聊天文件隔离，切换分支后数据"丢失"；
// - Memory Wizard 通过 resolveStorageKey() 返回角色头像文件名（稳定跨分支），
//   需要跨分支共享同一角色的记忆数据；
// - 在原 ST 后端中也是用扁平文件 + 稳定 key 命名实现跨分支共享。
//
// Key 命名规则：
//   全局数据（所有聊天共享）               → 无前缀：config, shared_tree, logs
//   角色/群组数据（同角色跨分支共享）       → 带前缀：tree_{stableId}, sum_{stableId}, sandbox_{stableId}
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const MODULE_ID = 'st-memory-wizzard';
    const LOG_PREFIX = '[Memory Wizard Shim]';

    // 检查 TauriTavern 环境
    const ttApi = window.__TAURITAVERN__;
    if (!ttApi) {
        console.error(`${LOG_PREFIX} TauriTavern API (window.__TAURITAVERN__) 不可用。`);
        window.STORE = null;
        return;
    }

    // 统一使用全局/扩展级 store，保证跨分支数据共享
    const store = ttApi.api?.extension?.store;
    if (!store) {
        console.error(`${LOG_PREFIX} TauriTavern extension store (api.extension.store) 不可用。`);
        window.STORE = null;
        return;
    }

    // metadata 作为备选（轻量数据，降级方案）
    const metadata = ttApi.api?.chat?.metadata;

    // ── 工具函数 ──────────────────────────────────────────────
    function safeKey(chatId) {
        return (chatId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    // ── 读写 helper：优先 extension.store，回退 metadata ──────
    async function storeRead(key) {
        try {
            return await store.getJson({ namespace: MODULE_ID, key: key });
        } catch (e) {
            // extension.store 不可用时尝试 metadata 回退
            if (metadata) {
                try {
                    const data = await metadata.get();
                    if (data && typeof data === 'object' && data[MODULE_ID] && data[MODULE_ID][key] !== undefined) {
                        return data[MODULE_ID][key];
                    }
                } catch { /* 忽略 */ }
            }
            return null;
        }
    }

    async function storeWrite(key, value) {
        try {
            await store.setJson({ namespace: MODULE_ID, key: key, value: value });
        } catch (e) {
            // extension.store 不可用时尝试 metadata 回退
            if (metadata) {
                try {
                    const data = (await metadata.get()) || {};
                    if (!data[MODULE_ID]) data[MODULE_ID] = {};
                    data[MODULE_ID][key] = value;
                    await metadata.setExtension({ namespace: MODULE_ID, value: data[MODULE_ID] });
                } catch { /* 忽略 */ }
            }
        }
    }

    async function storeListKeys() {
        try {
            const result = await store.listKeys({ namespace: MODULE_ID });
            // 兼容两种返回格式：string[] 或 {namespace, key}[]
            if (Array.isArray(result)) {
                return result.map(k => typeof k === 'string' ? { namespace: MODULE_ID, key: k } : k);
            }
            return [];
        } catch {
            return [];
        }
    }

    // ── 导出 STORE API 对象 ──────────────────────────────────

    window.STORE = {
        // ═══════════════════════════════════════════════════════
        // 配置（全局）
        // ═══════════════════════════════════════════════════════
        async getConfig() {
            const data = await storeRead('config');
            return data || {};
        },

        async saveConfig(config) {
            await storeWrite('config', config);
            return { success: true };
        },

        // ═══════════════════════════════════════════════════════
        // 记忆树（按角色/群组，跨分支共享）
        // ═══════════════════════════════════════════════════════
        async getTree(chatId) {
            const data = await storeRead(`tree_${safeKey(chatId)}`);
            return Array.isArray(data) ? data : [];
        },

        async saveTree(chatId, tree) {
            await storeWrite(`tree_${safeKey(chatId)}`, tree);
            return { success: true };
        },

        // 共有记忆（全局，所有角色共享）
        async getSharedTree() {
            const data = await storeRead('shared_tree');
            return Array.isArray(data) ? data : [];
        },

        async saveSharedTree(tree) {
            await storeWrite('shared_tree', tree);
            return { success: true };
        },

        // ═══════════════════════════════════════════════════════
        // 分层摘要（按角色/群组）
        // ═══════════════════════════════════════════════════════
        async getSummaries(chatId) {
            const data = await storeRead(`sum_${safeKey(chatId)}`);
            return data || { recaps: [], weeklySummaries: [], historicalSummaries: [], lastArchivedIndex: 0 };
        },

        async saveSummaries(chatId, summaries) {
            await storeWrite(`sum_${safeKey(chatId)}`, summaries);
            return { success: true };
        },

        // ═══════════════════════════════════════════════════════
        // 上下文融合沙盒（按角色/群组）
        // ═══════════════════════════════════════════════════════
        async getSandboxChat(chatId) {
            const data = await storeRead(`sandbox_${safeKey(chatId)}`);
            return Array.isArray(data) ? data : [];
        },

        async saveSandboxChat(chatId, chat) {
            await storeWrite(`sandbox_${safeKey(chatId)}`, chat);
            return { success: true };
        },

        // ═══════════════════════════════════════════════════════
        // 备份列表与读取（按 kind 列出 store key）
        // ═══════════════════════════════════════════════════════
        async listBackups(kind) {
            const prefixMap = {
                config: 'config',
                tree: 'tree_',
                summaries: 'sum_',
                sandbox: 'sandbox_',
            };
            const prefix = prefixMap[kind] || '';
            try {
                const allKeys = await storeListKeys();
                const matching = allKeys
                    .filter(k => {
                        const key = typeof k === 'object' ? k.key : k;
                        return key && key.startsWith(prefix);
                    })
                    .map(k => ({
                        name: `${typeof k === 'object' ? k.key : k}.json`,
                        location: 'store',
                        mtime: Date.now(),
                        size: 0,
                    }));
                return { backups: matching };
            } catch (e) {
                console.error(`${LOG_PREFIX} listBackups 失败:`, e);
                return { backups: [] };
            }
        },

        async readBackup(kind, name) {
            // name 形如 "tree_char_xxx.json"，去掉 .json 后缀即 store key
            const key = name.replace(/\.json$/i, '');
            try {
                const data = await storeRead(key);
                return { name: name, data: data };
            } catch (e) {
                console.error(`${LOG_PREFIX} readBackup 失败:`, e);
                return null;
            }
        },

        // ═══════════════════════════════════════════════════════
        // key 迁移：将旧 chatId 的数据复制到新 chatId
        // ═══════════════════════════════════════════════════════
        async migrateKey(fromChatId, toChatId) {
            const prefixes = ['tree_', 'sum_', 'sandbox_'];
            let migrated = 0;
            for (const prefix of prefixes) {
                const fromKey = `${prefix}${safeKey(fromChatId)}`;
                const toKey = `${prefix}${safeKey(toChatId)}`;
                try {
                    const data = await storeRead(fromKey);
                    if (data !== null && data !== undefined) {
                        // 只有目标 key 为空时才写入
                        const existing = await storeRead(toKey);
                        if (existing === null || existing === undefined ||
                            (Array.isArray(existing) && existing.length === 0) ||
                            (typeof existing === 'object' && !Array.isArray(existing) && Object.keys(existing).length === 0)) {
                            await storeWrite(toKey, data);
                            migrated++;
                        }
                    }
                } catch { /* 单个 key 迁移失败不影响其他 */ }
            }
            return { success: true, migrated };
        },

        // ═══════════════════════════════════════════════════════
        // 实时回填：根据沙盒备份补齐摘要的发送时间
        // ═══════════════════════════════════════════════════════
        async backfillRealtime({ summaries, sandboxName, sandboxLocation }) {
            const backup = await this.readBackup('sandbox', sandboxName);
            const sandboxChat = Array.isArray(backup?.data) ? backup.data : [];
            const patched = JSON.parse(JSON.stringify(summaries || {}));
            const sections = ['recaps', 'weeklySummaries', 'historicalSummaries'];
            let filled = 0;
            let skippedNoFloors = 0;
            let skippedNoTs = 0;

            const safeTime = (msg) => msg?.send_date || msg?.timestamp || msg?.date || null;
            const fmt = (v) => {
                const d = new Date(v);
                if (Number.isNaN(d.getTime())) return null;
                const p = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
            };
            const getRange = (item) => {
                const floors = item?.coveredFloors;
                if (floors && Number.isFinite(floors.lo) && Number.isFinite(floors.hi)) return floors;
                const source = item?.source || item?.timespan || '';
                const m = String(source).match(/(\d+)\s*[-~到]\s*(\d+)/);
                if (!m) return null;
                return { lo: Number(m[1]), hi: Number(m[2]) };
            };

            for (const section of sections) {
                const arr = Array.isArray(patched[section]) ? patched[section] : [];
                for (const item of arr) {
                    const range = getRange(item);
                    if (!range) { skippedNoFloors += 1; continue; }
                    const start = sandboxChat[range.lo - 1];
                    const end = sandboxChat[range.hi - 1] || start;
                    const startTs = safeTime(start);
                    const endTs = safeTime(end);
                    if (!startTs || !endTs) { skippedNoTs += 1; continue; }
                    const span = startTs === endTs ? fmt(startTs) : `${fmt(startTs)} ~ ${fmt(endTs)}`;
                    if (span) {
                        item.realTimespan = span;
                        if (!item.coveredFloors) item.coveredFloors = { lo: range.lo, hi: range.hi };
                        filled += 1;
                    }
                }
            }

            return { summaries: patched, filled, sandboxLen: sandboxChat.length, skippedNoFloors, skippedNoTs };
        },

        // ═══════════════════════════════════════════════════════
        // 日志（全局）
        // ═══════════════════════════════════════════════════════
        async writeLog(message, level) {
            console.log(`[Memory Wizard] [${level || 'INFO'}] ${message}`);
            try {
                const data = await storeRead('logs');
                const logs = Array.isArray(data) ? data.slice(-199) : [];
                logs.push({ time: new Date().toISOString(), level: level || 'INFO', message });
                await storeWrite('logs', logs);
            } catch { /* 忽略 */ }
        },

        async getLogs(limit) {
            try {
                const data = await storeRead('logs');
                const logs = Array.isArray(data) ? data : [];
                return logs.slice(Math.max(0, logs.length - Math.max(1, limit || 50)));
            } catch {
                return [];
            }
        },

        // ═══════════════════════════════════════════════════════
        // 连通性检测
        // ═══════════════════════════════════════════════════════
        async ping() {
            try {
                await storeRead('config');
                return true;
            } catch {
                return false;
            }
        },
    };

    console.log(`${LOG_PREFIX} STORE API 初始化完成 (extension.store)。`);
})();
