# multica-ai/multica @7a438bd 对 taskboard 的可参考点报告

## 后端

### F1 结构化错误模型与修订冲突响应
- 来源：multica:server/internal/handler/handler.go:571
- 落点：taskboard:server/app.mjs
- 工作量：S
- 档：执行记录
multica 使用 `writeErrorCode` 与 `writeRevisionConflict` 输出带稳定 machine code 和版本号比对的 JSON 错误体，支持客户端精准判定并发编辑冲突与多语言翻译。taskboard 当前在 `server/app.mjs` 直接返回 `{ error: message }` 纯文本，引入结构化 error code 与 optimistic revision 冲突校验能显著改善并发编辑与 agent 冲突时的容错。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/handler.go | grep -n "func writeRevisionConflict"` 取值为 `575:func writeRevisionConflict(w http.ResponseWriter, resourceType string, resourceID pgtype.UUID, expected, actual int64) {`。

### F2 进程内同步事件总线与领域事件解耦
- 来源：multica:server/internal/events/bus.go:27
- 落点：taskboard:server/app.mjs
- 工作量：S
- 档：执行记录
multica 在后端使用单进程同步事件总线 `events.Bus` 分发领域事件（如 `issue:created`, `inbox:new`），并将 HTTP handler 与 websocket fanout/通知彻底解耦。taskboard 现状在 `server/app.mjs` 各路由就地广播 SSE 事件，抽出统一的 EventBus 能将活动记录、通知触发和 SSE 推送逻辑收拢。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/events/bus.go | grep -n "type Bus struct"` 取值为 `27:type Bus struct {`。

### F3 双重时间排序的时间线截断 SQL 模式
- 来源：multica:server/pkg/db/queries/activity.sql:18
- 落点：taskboard:server/database.mjs
- 工作量：S
- 档：执行记录
multica 在活动日志分页查询中使用子查询 `ORDER BY created_at DESC LIMIT $2` 截取最新 N 条，外层再 `ORDER BY created_at ASC` 恢复正序，防止高频活动（如 agent 执行、自动保存）撑爆时间线导致前端看不到最新记录。taskboard 的 `task_activities` 查询可直接借鉴该 SQL 模式，保证高频更新下的时间线最新状态不被旧记录挤占。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/pkg/db/queries/activity.sql | grep -n "SELECT \* FROM ("` 取值为 `18:SELECT * FROM (`。

### F4 统一调度准入状态码枚举与无损原因分发
- 来源：multica:server/internal/dispatch/reason.go:17
- 落点：taskboard:server/app.mjs
- 工作量：S
- 档：执行记录
multica 将 agent 任务触发与准入决策的拒绝原因（如 `runtime_offline`, `already_active`, `self_trigger_suppressed`）抽象为跨层共享的严格枚举，避免在 UI 层用模糊字符串猜测拒绝原因。taskboard 当前在 `server/app.mjs` 与 CLI 之间缺乏准入拦截码，借鉴该枚举有助于协调席与 agent 快速判定阻碍类型。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/dispatch/reason.go | grep -n "type ReasonCode string"` 取值为 `17:type ReasonCode string`。

### F5 基于 PostgreSQL 与 Redis 分片流的多租户 WebSocket 架构
- 来源：multica:server/internal/realtime/sharded_stream_relay.go:1
- 落点：不适用
- 工作量：L
- 档：执行记录
multica 采用 Redis Stream 分片中继与 Gorilla WebSocket Hub 支持跨进程集群广播与租户/资源订阅。taskboard 仅为单机单进程 Node + SQLite，当前简化的原生 SSE `/api/events` 已足够轻量且无外部依赖，引入 Redis 与分布式 Hub 属于规模与栈过度设计，不予采纳。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/realtime/sharded_stream_relay.go | head -1` 取值为 `package realtime`。

### F6 多层级企业级 Workspace 权限与 PAT 鉴权体系
- 来源：multica:server/internal/auth/jwt.go:1
- 落点：不适用
- 工作量：M
- 档：执行记录
multica 设计了完整的 JWT + PAT + 角色矩阵（owner/admin/member/guest/agent）与多工作区数据隔离。taskboard 专为单人协同多 agent 场景设计，仅靠 `assertTrustedNetworkRequest` 白名单与 `TASKBOARD_THREAD_ID` 区分身份，引入多租户与复杂 RBAC 会增加无谓的维护成本，不适用。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/auth/jwt.go | head -1` 取值为 `package auth`。

## 前端

### F7 Core 与 Views 解耦与 NavigationAdapter 抽象
- 来源：multica:packages/views/navigation/types.ts:1
- 落点：taskboard:web/src/App.tsx
- 工作量：M
- 档：执行记录
multica 将业务视图与底层路由解耦，通过 `NavigationAdapter`（`push`, `replace`, `back`, `hash`）抹平 Web（Next.js）与 Desktop（Electron MemoryRouter）差异。taskboard 当前在 `web/src/App.tsx`（2600+ 行）手写 URL 状态机且无路由抽象，提取轻量 NavigationAdapter 能显著简化 `App.tsx` 的臃肿状态管理并为视图拆分奠定基础。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/views/navigation/types.ts | grep -n "export interface NavigationAdapter"` 取值为 `1:export interface NavigationAdapter {`。

### F8 服务端状态与客户端视图状态分层架构
- 来源：multica:packages/core/package.json:18
- 落点：taskboard:web/src/api.ts
- 工作量：M
- 档：执行记录
multica 严格规定 React Query 管理所有服务端数据缓存与失效，Zustand 仅管理前端瞬态交互（草稿、弹窗、本地筛选）。taskboard 目前在 `App.tsx` 顶层统一用 `useState` 维护庞大的单体 state，引入 TanStack Query 配合 SSE 事件自动回灌，可免去大量手写数据同步与刷新逻辑。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/core/package.json | grep -n '"zustand"'` 取值为 `18:    "zustand": "catalog:"`。

### F9 TipTap 富文本编辑器扩展与 Markdown 双向往返
- 来源：multica:packages/views/package.json:54
- 落点：taskboard:web/src/components/TaskEditor.tsx
- 工作量：M
- 档：执行记录
multica 采用 TipTap 及其 `@tiptap/markdown`、mention、slash-command 扩展，实现了富文本所见即所得编辑与底层标准 Markdown 字符串的无损往返。taskboard 当前在 `TaskEditor.tsx` 中使用原生 textarea + marked 渲染，引入 TipTap 扩展集可提供 @mention 补全、代码块高亮与附件拖拽粘贴的现代化编辑体验。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/views/package.json | grep -n '"@tiptap/markdown"'` 取值为 `54:    "@tiptap/markdown": "3.27.1",`。

### F10 虚拟滚动列表与高频渲染性能保障
- 来源：multica:packages/views/package.json:71
- 落点：taskboard:web/src/components/IssueListView.tsx
- 工作量：S
- 档：执行记录
multica 列表视图采用 `react-virtuoso` 虚拟滚动，保证数千条议题加载时 DOM 节点数恒定。taskboard 在 `web/src/components/IssueListView.tsx` 中为全量 DOM 渲染，当 agent 生成数十条任务与活动时会出现卡顿，引入轻量虚拟列表有助于保持流畅度。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/views/package.json | grep -n '"react-virtuoso"'` 取值为 `71:    "react-virtuoso": "catalog:",`。

### F11 多语言全量国际化与 RTL 及 CJK 字符排版支持
- 来源：multica:pnpm-workspace.yaml:30
- 落点：不适用
- 工作量：L
- 档：执行记录
multica 维护了完整的 `i18next` 框架及多语种（en/zh-Hans/ja/ko）词条与 CJK 标点优化。taskboard 仅面向个人与 agent 协同，当前 `web/src/i18n.tsx` 内嵌的双语常量映射已满足需求，无须引入复杂 i18n 框架。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:pnpm-workspace.yaml | grep -n 'react-i18next'` 取值为 `30:  react-i18next: ^17.0.6`。

## 技术栈与工程实践

| 组件 | multica | taskboard 现状 |
|---|---|---|
| 语言与版本 | Go 1.26 + TypeScript 5.9 (Node >=22) | Node 22 (ESM) + TypeScript 5.8 |
| Web 框架 | Next.js 15 (App Router) + Chi (Go) | React 19 SPA (Vite) + 原生 Node http |
| 数据库与迁移 | PostgreSQL + 450 份 SQL 迁移 + sqlc | SQLite (`node:sqlite`) + `server/database.mjs` |
| 实时通道 | WebSocket (Gorilla + Redis Stream 分片) | Server-Sent Events (SSE, `/api/events`) |
| 构建系统 | Turborepo + pnpm monorepo + Go toolchain | npm + Vite + tsc |
| 测试框架 | Vitest (TS) + Go `testing` (`-race`) + Playwright | Node 内置 `node:test` + Vitest |
| Lint 与检查 | ESLint 9 + Knip + govulncheck | ESLint + tsc |
| 桌面 / 移动端 | Electron (desktop) + Expo/React Native (mobile) | 无（纯 Web SPA） |
| 自托管与部署 | Docker Compose + GoReleaser + Homebrew Tap | 单进程 Node 直接启动 (`node server/index.mjs`) |

### F12 Knip 依赖与无用代码自动化门禁
- 来源：multica:knip.jsonc:10
- 落点：taskboard:package.json
- 工作量：S
- 档：执行记录
multica 使用 Knip 作为 CI 阻塞项，自动扫描未声明依赖、幽灵依赖及无用死代码。taskboard 随版本迭代产生多处未引用常量与冗余 CSS，在 `package.json` 中配置 knip 检查可在 CI 中低成本拦截无用导出与依赖污染。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:knip.jsonc | grep -n '"include"'` 取值为 `10:  "include": ["files", "dependencies", "unlisted"],`。

### F13 Turborepo 跨包指纹与缓存穿透防护
- 来源：multica:turbo.json:32
- 落点：不适用
- 工作量：M
- 档：执行记录
multica 在 Turborepo 中设计了 `cache-inputs` 虚拟任务来跨 package 传递依赖文件指纹，避免 monorepo 跨包缓存命中错误。taskboard 为单包结构，npm scripts 与 Vite 构建即可满足全部流程，无须引入 Turborepo。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:turbo.json | grep -n '"cache-inputs"'` 取值为 `32:    "cache-inputs": {`。

### F14 GitHub Actions 路径过滤与差异化增量验证
- 来源：multica:.github/workflows/ci.yml:23
- 落点：新建 .github/workflows/ci.yml
- 工作量：S
- 档：执行记录
multica 在 CI 顶层使用 `dorny/paths-filter` 对 frontend / backend / docs / images 做路径过滤，纯文档与后端改动跳过前端构建测试。taskboard 当前在本地由协调席验证，若上 GitHub Actions 引入该 filter 可将 docs-only 任务的 CI 耗时降至数秒。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:.github/workflows/ci.yml | grep -n "dorny/paths-filter"` 取值为 `23:        uses: dorny/paths-filter@v3`。

### F15 Conventional Commits 与 Agent 协同提交纪律
- 来源：multica:CLAUDE.md:120
- 落点：taskboard:docs/agents/coordinator.md
- 工作量：S
- 档：执行记录
multica 的提交历史严格遵守 Conventional Commits 前缀规范（前 300 条中 242 条带标准 scope 格式），且出现 AI agent（`Multica Eve` 59 次提交）与人类开发者共用同一套 PR / commit 规约。taskboard 协调席可借鉴其 scope 命名规则规范各 agent 交付 commit。命令 `git -C /Users/happy/projects/multica-upstream log --format=%s -300 | grep -cE '^(fix|feat|docs|refactor|perf|test|chore)\('` 取值为 `242`。

## agent 机制

### F16 任务隔离工作区与 RepoCache 缓存机制
- 来源：multica:server/internal/daemon/repocache/cache.go:1
- 落点：taskboard:cli/taskctl.mjs
- 工作量：M
- 档：执行记录
multica daemon 在本地执行任务时，通过 `repocache` 从共享 git 缓存按需检出独立的 task workdir，防止并发 agent 任务互相污染工作区文件。taskboard 当前由协调席分配 branch / worktree，若在 `taskctl` 或底层脚本中引入类似的工作区隔离机制可提高多 agent 并行安全性。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/daemon/repocache/cache.go | head -1` 取值为 `package repocache`。

### F17 统一 Skills Lockfile 校验与锁定机制
- 来源：multica:skills-lock.json:6
- 落点：新建 skills-lock.json
- 工作量：S
- 档：执行记录
multica 使用 `skills-lock.json` 记录所有 agent skills 的来源（GitHub repo）、子路径与 SHA-256 哈希值，确保不同机器和 daemon 获取的 skill 实现确定无篡改。taskboard 当前在 prompt 中直接引用 skill，引入 skills-lock 能够规范 agent 技能版本的不可变分发。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:skills-lock.json | grep -n '"computedHash"' | head -1` 取值为 `6:      "computedHash": "063a0e6448123cd359ad0044cc46b0e490cc7964d45ef4bb9fd842bd2ffbca67"`。

### F18 Squad 协作模式与 Leader-Worker 双层任务流
- 来源：multica:server/internal/handler/squad.go:24
- 落点：taskboard:docs/agents/coordinator.md
- 工作量：M
- 档：执行记录
multica 抽象了 Squad 实体，由 Leader agent 负责拆解议题、生成子任务并派发给 Worker agents，Worker 评论唤醒 Leader 汇总，实现了系统层面的多 agent 协同。taskboard 目前完全由人类/协调席（`coordinator.md`）手工执行派发与盯场，Squad 的分工契约对未来自动化多 agent 调度具有很高参考价值。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/squad.go | grep -n "type SquadResponse struct"` 取值为 `24:type SquadResponse struct {`。

### F19 Plugin SDK 与 MCP 扩展调用门禁
- 来源：multica:packages/plugin-sdk/index.ts:1
- 落点：taskboard:server/app.mjs
- 工作量：M
- 档：执行记录
multica 提供独立的 `@multica/plugin-sdk`，通过类型安全的 JSON-RPC 协议与 MCP 扩展集成，并在服务端（`plugin_mcp.go`）实施权限与审批门禁。taskboard 目前所有能力均为内置，若未来扩展外部工具调用可参考其 protocol 与审批门禁设计。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/plugin-sdk/index.ts | head -1` 取值为 `export * from "./protocol";`。

### F20 声明式 Agent 长期自治运行模式
- 来源：multica:CLI_AND_DAEMON.md:208
- 落点：不适用
- 工作量：L
- 档：仅声明
multica 在 `CLI_AND_DAEMON.md` 中声称支持 Autopilot 定时巡检与 issue 自动创建，但在代码库中该能力深度依赖其云端配额与订阅服务（`server/internal/entitlement`）。taskboard 的运行模式是由协调席按 issue 单次派发即时完成验收闭环，不需要后台常驻自治守护进程。

## 最值得先抄的 3 条
1. F1：结构化错误模型与修订冲突响应——极小代码量即可解决 taskboard 在并发编辑与多 agent 协同操作同一议题时的静默覆盖与错误定位难题。
2. F7：NavigationAdapter 抽象与业务视图解耦——为重构 taskboard 2600+ 行臃肿单体 `App.tsx` 提供清晰的无损拆分路径。
3. F17：统一 Skills Lockfile 校验机制——轻量级引入 `skills-lock.json` 即可锁定跨 agent 调用的技能版本与内容哈希，保障多席位协同的执行确定性。

## 我没能确认的
- 搜索 `docs/solutions` compound 模式未找到任何对应文件：使用 `git -C /Users/happy/projects/multica-upstream ls-files docs` 仅发现 `docs/assets/` 下 4 个静态资源文件，通过 `git grep -i "solutions"` 搜索全仓也仅匹配到评论折叠和冲突解决等业务词汇，确认 multica 上游未收录独立于 `apps/docs` 的 solutions 文档体系。
- 搜索 `apps/web` 是否有与 `apps/desktop` 完全隔离的独立状态树，经核查两端统一通过 `packages/core/platform/core-provider.tsx` 共享同一套 Zustand stores 与 React Query 客户端，但在 Next.js SSR 场景下的 store 水合边界未在代码中找到专门的序列化注入测试。

## 取值
multica HEAD 前：7a438bd5b8bf39afd54259a7eb0971390e50a8ef
multica HEAD 后：7a438bd5b8bf39afd54259a7eb0971390e50a8ef
multica porcelain 前：0
multica porcelain 后：0
git -C /Users/happy/projects/multica-upstream rev-parse HEAD > /tmp/d5_cmd1.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream status --porcelain | wc -l > /tmp/d5_cmd2.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/handler.go > /tmp/d5_cmd3.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/events/bus.go > /tmp/d5_cmd4.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/pkg/db/queries/activity.sql > /tmp/d5_cmd5.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/dispatch/reason.go > /tmp/d5_cmd6.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/realtime/sharded_stream_relay.go > /tmp/d5_cmd7.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/auth/jwt.go > /tmp/d5_cmd8.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/views/navigation/types.ts > /tmp/d5_cmd9.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/core/package.json > /tmp/d5_cmd10.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/views/package.json > /tmp/d5_cmd11.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:pnpm-workspace.yaml > /tmp/d5_cmd12.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:knip.jsonc > /tmp/d5_cmd13.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:turbo.json > /tmp/d5_cmd14.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:.github/workflows/ci.yml > /tmp/d5_cmd15.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/daemon/repocache/cache.go > /tmp/d5_cmd16.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:skills-lock.json > /tmp/d5_cmd17.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/squad.go > /tmp/d5_cmd18.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/plugin-sdk/index.ts > /tmp/d5_cmd19.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:CLI_AND_DAEMON.md > /tmp/d5_cmd20.log 2>&1; e=$? -> e=0
