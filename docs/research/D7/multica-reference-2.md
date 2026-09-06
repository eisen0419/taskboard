# multica-ai/multica @7a438bd 对 taskboard 的可参考点报告（第二部分）

## inbox 通知

### F1 inbox_item 聚合通知模型与已读归档状态机
- 来源：multica:server/migrations/001_init.up.sql:110
- 落点：taskboard:server/database.mjs
- 工作量：S
- 档：执行记录
multica 使用 `inbox_item` 表统一管理事件通知，支持 `action_required`、`attention`、`info` 三档严重度与已读/归档状态流转。taskboard 当前缺少通知数据层，人与 agent 之间的卡点只能靠人工读屏发现；在 `server/database.mjs` 中引入通知表能为 agent 运行异常与人工审查提供统一提醒通道。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/migrations/001_init.up.sql | grep -n "CREATE TABLE inbox_item ("` 取值为 `110:CREATE TABLE inbox_item (`。

### F2 基于议题分组去重与批量归档的 Inbox 视图
- 来源：multica:packages/views/inbox/components/inbox-page.tsx:28
- 落点：新建 web/src/components/InboxView.tsx
- 工作量：M
- 档：执行记录
multica 前端在客户端通过 `deduplicateInboxItems` 将同一议题的多条通知折叠为单一视图行，并提供批量已读与完成归档快捷操作。taskboard 可在前端新建 `InboxView` 组件，将分散在任务和活动流中的事件聚合展示，避免大量并发 agent 产出刷屏。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/views/inbox/components/inbox-page.tsx | grep -n "deduplicateInboxItems"` 取值为 `28:  deduplicateInboxItems,`。

## 议题关系

### F3 混合层级关系模型与子议题视图组织
- 来源：multica:server/migrations/001_init.up.sql:89
- 落点：taskboard:server/database.mjs
- 工作量：S
- 档：执行记录
multica 采用双轨关系设计：主表 `parent_issue_id` 维护单亲子树层级，另设 `issue_dependency` 表记录 `blocks`、`blocked_by`、`related` 图依赖。taskboard 目前使用统一的 `task_relations` 图表及 SQLite 递归触发器防环，结构上更为严谨；但在 UI 交互上可参考 multica 按父任务聚合的看板折叠呈现模式。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/migrations/001_init.up.sql | grep -n "CREATE TABLE issue_dependency ("` 取值为 `89:CREATE TABLE issue_dependency (`。

## 附件存储

### F4 多后端统一 Storage 接口抽象与预签名机制
- 来源：multica:server/internal/storage/storage.go:9
- 落点：taskboard:server/app.mjs
- 工作量：M
- 档：执行记录
multica 定义了标准 `Storage` 接口（`Upload`、`Delete`、`GetReader`、`ObjectURL`），支持本地磁盘与 AWS S3 / CloudFront 预签名下载双实现。taskboard 当前在 `server/app.mjs` 中直接操作本地磁盘，抽象统一存储接口可隔离底层文件系统操作，便于后续测试与路径安全收敛。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/storage/storage.go | grep -n "type Storage interface {"` 取值为 `9:type Storage interface {`。

### F5 附件上传体积硬限制与 MIME 扩展纠偏
- 来源：multica:server/internal/handler/file.go:36
- 落点：taskboard:server/app.mjs
- 工作量：S
- 档：执行记录
multica 在文件上传网关设置了 100 MB 上限（`maxUploadSize = 100 << 20`）和 2 MB 预览上限，并通过 `extContentTypes` 映射表显式纠正 Go 标准库对 SVG/CSS/JS/WASM 嗅探偏差。taskboard 的附件上传路由缺少明确的大小截断与 MIME 纠偏，借鉴该防护可避免大文件撑爆进程与媒体渲染异常。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/file.go | grep -n "const maxUploadSize"` 取值为 `36:const maxUploadSize = 100 << 20 // 100 MB`。

## 命令面板与深链

### F6 基于 cmdk 的统一命令面板与全局模态检索
- 来源：multica:packages/ui/components/ui/command.tsx:20
- 落点：新建 web/src/components/CommandPalette.tsx
- 工作量：M
- 档：执行记录
multica 基于 `cmdk` 原语封装了全局命令面板，支持模糊搜索、任务跳转、快捷操作与主题切换。taskboard 当前完全依赖侧边栏与页面点击，引入 `CommandPalette` 能大幅提升多任务/多项目并行时的键盘检索与导航效率。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/ui/components/ui/command.tsx | grep -n "function Command("` 取值为 `20:function Command({`。

### F7 平台自适应快捷键总线与按键定义抽取
- 来源：multica:packages/core/shortcuts/definitions.ts:8
- 落点：新建 web/src/shortcuts.ts
- 工作量：S
- 档：执行记录
multica 将全部快捷键抽离为结构化的 `ShortcutActionDefinition` 注册表，自动抹平 macOS 与 Windows/Linux 修饰键（Cmd vs Ctrl）并在可编辑输入框内屏蔽冲突按键。taskboard 的快捷键散落在组件各处，建立统一的 `shortcuts.ts` 注册表能显著提升键盘操作一致性。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/core/shortcuts/definitions.ts | grep -n "export type ShortcutActionId =" ` 取值为 `8:export type ShortcutActionId =`。

## agent 触发链

| 环节 | 位置 | 一句话 |
|---|---|---|
| 触发 | multica:server/internal/service/task.go:1103 | 议题指派、评论@提及或手动触发时通过 EnqueueTaskForIssue 将任务入队 |
| 准入 | multica:server/internal/service/agent_ready.go:105 | 评估 Agent 运行时就绪状态、配额与权限，产出结构化 ReasonCode 准入判定 |
| 领取 | multica:server/internal/handler/daemon.go:3329 | Daemon 通过 ClaimTaskByRuntime 原子领取队列任务并签发任务短期访问令牌 |
| 执行 | multica:server/internal/daemon/execenv/execenv.go:1 | Daemon 隔离工作区并挂载 Skills 与 MCP 工具，启动子进程执行 Agent 逻辑 |
| 流回 | multica:server/internal/handler/daemon.go:4611 | Daemon 批量调用 ReportTaskMessages 回传执行日志并经由 WebSocket 实时广播 |
| 回写 | multica:server/internal/service/task.go:4311 | CompleteTask 完成任务清算，更新议题状态、持久化评论/附件并写入通知 |

### F8 六环解耦的 AgentTaskQueue 状态机与租约机制
- 来源：multica:server/internal/service/task.go:3473
- 落点：taskboard:docs/agents/coordinator.md
- 工作量：M
- 档：执行记录
multica 将任务全生命周期解耦为 6 环并用 `ClaimTask` 提供原子租约抢占与重试保护。taskboard 当前由协调席在 `coordinator.md` 规约下手动推进任务派发与状态流转，借鉴其清晰的状态机切分有助于理清多席位 agent 协作时的边界与职责。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/service/task.go | grep -n "func (s \*TaskService) ClaimTask("` 取值为 `3473:func (s *TaskService) ClaimTask(ctx context.Context, agentID pgtype.UUID) (*db.AgentTaskQueue, error) {`。

### F9 批量上报与实时广播的 Agent 执行进度流回
- 来源：multica:server/internal/handler/daemon.go:4611
- 落点：taskboard:server/app.mjs
- 工作量：S
- 档：执行记录
multica 通过 `ReportTaskMessages` 接口支持 daemon 批量上报 agent 的中间思考与工具执行步骤，并持久化后实时广播至前端。taskboard 目前依靠协调席读屏获取运行进展，在 `server/app.mjs` 增加结构化 progress 接口并通过 SSE 推送可使前端获得实时的 agent 运行能见度。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/daemon.go | grep -n "func (h \*Handler) ReportTaskMessages("` 取值为 `4611:func (h *Handler) ReportTaskMessages(w http.ResponseWriter, r *http.Request) {`。

### 对照 taskboard
- 派发阶段：multica 的「触发+准入+领取」由后端队列和 daemon 轮询全自动完成；taskboard 目前由协调席人工开 worktree、切分支并撰写 brief 派发。multica 的 repocache 自动建目录可简化 taskboard 的 worktree 准备，但 brief 的业务裁量仍需协调席保留。
- 盯场阶段：multica 的「执行+流回」通过 daemon 上报和 WebSocket 全量广播；taskboard 目前由协调席直接观察 worker 终端与 Orca heartbeat。引入轻量消息流回接口可简化协调席读屏负担，使前端获得实时执行能见度。
- 验收与 PR 阶段：multica 的「回写」在任务完成后直接改状态、写评论并自动提 PR；taskboard 坚持通过 coordinator 跑 npm run check、多席位交叉审查（如 grok 审查席）与手工合并。multica 的自动回写无法替代 taskboard 的强门禁验证，但其生成的结构化执行摘要与附件绑定可直接作为审查证据包。

## 集成

- GitHub：执行记录
- Slack：执行记录
- webhooks：执行记录

### F10 GitHub App 深度集成与 PR 状态双向联动
- 来源：multica:server/internal/handler/github.go:54
- 落点：不适用
- 工作量：L
- 档：执行记录
multica 实现了完整的 GitHub App 集成，支持 OAuth 安装鉴权、PR Webhook 事件监听、Check Run CI 状态同步与 issue 自动关闭。taskboard 专注于单人本地多 agent 开发环境，直接使用 `git` 与 `gh` CLI 交互，引入企业级 GitHub App 与多租户 webhook 路由属于架构过度设计，不适用。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/github.go | grep -n "type GitHubInstallationResponse struct {"` 取值为 `54:type GitHubInstallationResponse struct {`。

### F11 多平台 Chat 消息适配器与 Slack Mrkdwn 往返
- 来源：multica:server/internal/integrations/slack/channel.go:19
- 落点：不适用
- 工作量：M
- 档：执行记录
multica 通过 `slack.SlackChannel` 支持 Slack App 安装、Slash 命令解析、双向消息路由与 Mrkdwn 格式化往返转换。taskboard 的用户与 agent 交互全部收敛在本地 Web UI 与 Orca 编排终端内，无需远程 IM 通道，引入第三方即时通信集成不适用。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/integrations/slack/channel.go | grep -n "const TypeSlack channel.Type = \"slack\""` 取值为 `19:const TypeSlack channel.Type = "slack"`。

### F12 签名校验与幂等重放的 Webhook Delivery 管道
- 来源：multica:server/internal/handler/webhook_delivery.go:26
- 落点：不适用
- 工作量：M
- 档：执行记录
multica 构建了入站 Webhook 投递管道（`WebhookDeliveryResponse`、HMAC 签名校验、`webhook_delivery_worker` 异步队列与幂等重放）。taskboard 为单机本地进程，触发均来自 CLI 或本地浏览器 API 调用，不需要处理外部入站 Webhook 队列重试与重放机制，不适用。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/webhook_delivery.go | grep -n "type WebhookDeliveryResponse struct {"` 取值为 `26:type WebhookDeliveryResponse struct {`。

## 限流

- 限流：执行记录

### F13 基于 Redis Lua 脚本的 HTTP 滑动窗口限流
- 来源：multica:server/internal/middleware/ratelimit.go:19
- 落点：不适用
- 工作量：S
- 档：执行记录
multica 使用 Redis Lua 脚本执行原子递增并设置窗口 TTL，实现对公共 API、IP 和 Workspace 的滑动窗口限流防刷。taskboard 为单人本地 Node 单体，所有 API 调用来自受信任的 localhost 页面与本地 CLI（`assertTrustedNetworkRequest` 白名单），引入分布式 Redis 限流中间件没有实际防护价值，不适用。命令 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/middleware/ratelimit.go | grep -n "var rateLimitScript = redis.NewScript("` 取值为 `19:var rateLimitScript = redis.NewScript(`。

## 最值得先抄的 3 条

1. F1：inbox 通知模型与批量归档流——以极低成本在 SQLite 建立结构化通知表，彻底解决 taskboard 当前需协调席人工读屏/翻日志获知 agent 完成或报错的体验痛点。
2. F5：附件尺寸上限与 MIME 扩展纠偏——仅需数行代码即可为 `server/app.mjs` 补齐上传体积截断和 SVG/JS 等特殊文件类型的 Content-Type 纠偏，防止脏数据溢出。
3. F7：平台自适应快捷键总线与按键定义抽取——将散落在 `App.tsx` 各处的键盘监听归拢为声明式注册表，抹平 macOS 与 Linux/Windows 修饰键差异并防止输入框内热键误触。

## 我没能确认的

- 搜索 WebSocket 层的每连接滑动窗口限流：在 `server/internal/realtime/hub.go` 中核验到入站帧大小硬限制 `inboundReadLimit`（735 行日志与 918 行警告），但通过命令 `git -C /Users/happy/projects/multica-upstream grep -n "message_rate" server/internal/realtime/` 未找到针对单个客户端发消息频率的令牌桶或滑动窗口限流逻辑（退出码 1）。
- 搜索 `issue_dependency` 表在前端界面的完整可视化渲染：核查了 `server/migrations/001_init.up.sql:89` 的表定义与 `server/pkg/db/queries/workspace_delete.sql` 的级联删除，但通过命令 `git -C /Users/happy/projects/multica-upstream grep -n "issue_dependency" packages/views/` 全局搜索未在前端视图代码中找到 blocks/blocked_by 依赖关系的专用独立编辑与渲染组件（退出码 1）。

## 取值

multica HEAD 前：7a438bd5b8bf39afd54259a7eb0971390e50a8ef
multica HEAD 后：7a438bd5b8bf39afd54259a7eb0971390e50a8ef
multica porcelain 前：0
multica porcelain 后：0
git -C /Users/happy/projects/multica-upstream rev-parse HEAD > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_1.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream status --porcelain | wc -l > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_2.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/migrations/001_init.up.sql | grep -n "CREATE TABLE inbox_item (" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_3.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/views/inbox/components/inbox-page.tsx | grep -n "deduplicateInboxItems" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_4.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/migrations/001_init.up.sql | grep -n "CREATE TABLE issue_dependency (" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_5.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/storage/storage.go | grep -n "type Storage interface {" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_6.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/file.go | grep -n "const maxUploadSize" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_7.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/ui/components/ui/command.tsx | grep -n "function Command(" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_8.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:packages/core/shortcuts/definitions.ts | grep -n "export type ShortcutActionId =" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_9.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/service/task.go | grep -n "func (s \*TaskService) EnqueueTaskForIssue(" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_10.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/service/agent_ready.go | grep -n "func AgentReadiness(" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_11.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/daemon.go | grep -n "func (h \*Handler) ClaimTaskByRuntime(" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_12.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/daemon/execenv/execenv.go | head -1 > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_13.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/daemon.go | grep -n "func (h \*Handler) ReportTaskMessages(" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_14.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/service/task.go | grep -n "func (s \*TaskService) CompleteTask(" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_15.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/service/task.go | grep -n "func (s \*TaskService) ClaimTask(" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_16.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/github.go | grep -n "type GitHubInstallationResponse struct {" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_17.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/integrations/slack/channel.go | grep -n 'const TypeSlack channel.Type = "slack"' > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_18.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/webhook_delivery.go | grep -n "type WebhookDeliveryResponse struct {" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_19.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/middleware/ratelimit.go | grep -n "var rateLimitScript = redis.NewScript(" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_20.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream grep -n "message_rate" server/internal/realtime/ > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_21.log 2>&1; e=$? -> e=1
git -C /Users/happy/projects/multica-upstream grep -n "issue_dependency" packages/views/ > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_22.log 2>&1; e=$? -> e=1
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/handler/file.go | grep -n "const maxPreviewTextSize" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_23.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/realtime/hub.go | grep -n "pre-auth frame exceeded read limit" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_24.log 2>&1; e=$? -> e=0
git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:server/internal/realtime/hub.go | grep -n "inbound frame exceeded read limit" > /Users/happy/projects/taskboard/.scratch/d7-native/logs/cmd_25.log 2>&1; e=$? -> e=0
