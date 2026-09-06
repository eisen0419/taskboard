FAIL
reviewedHead: 87db745bd2a2c4f72e2b9c6074061295fa6874fd
fixedPoint: 935c954c80844d08b9095212033e9282eba739c2
diffCommand: git diff 935c954c80844d08b9095212033e9282eba739c2..87db745bd2a2c4f72e2b9c6074061295fa6874fd
commits: 87db745 docs(research): D7 multica reference report part 2 (#7)
implReport: /Users/happy/projects/taskboard/.scratch/d7-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/7 （验收 8 + Out of scope 5；comments 空）
conclusion: 逐条核过（①–⑧ 命令与取值均为本席亲跑；抽核 0 为正文计数全量复现，抽核 1–4 为抽核；未改交付物、未跑 npm、未 push）

验收 8 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到 ⑦做到 ⑧半做。Out of scope 5 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：抽核 0（正文 2 MB / 735 / 918 无 `## 取值` 命令）及 ⑧ 同款缺口。

## Spec 轴

`<file>` = `docs/research/D7/multica-reference-2.md`。审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `935c954..87db745`（审查开始时实现 commit 恰 1）。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 交付物与 commit | 做到 | `test -f docs/research/D7/multica-reference-2.md && echo EXISTS` → `EXISTS`。`git rev-list --count 935c954..HEAD` → `1`。`git diff-tree -r --numstat --no-commit-id HEAD` → `166	0	docs/research/D7/multica-reference-2.md`；`… \| wc -l` → `1`。`wc -l < docs/research/D7/multica-reference-2.md` → `166`（≤ 300）。 |
| ② 十个二级标题 | 做到 | `grep -E '^## ' docs/research/D7/multica-reference-2.md \| tr '\n' '|'` → `## inbox 通知\|## 议题关系\|## 附件存储\|## 命令面板与深链\|## agent 触发链\|## 集成\|## 限流\|## 最值得先抄的 3 条\|## 我没能确认的\|## 取值\|`（逐字）。 |
| ③ 七面 F + 形状 | 做到 | 七面 `sed -n '/^## <本节>$/,/^## <下一节>$/p' … \| grep -cE '^### F[0-9]+ '` → inbox **2** / 议题关系 **1** / 附件存储 **2** / 命令面板与深链 **2** / agent 触发链 **2** / 集成 **3** / 限流 **1**（各 ≥ 1）。`grep -cE '^### F[0-9]+ '` → `13`（∈ [7, 30]）。`diff <(grep -oE '^### F[0-9]+ ' … \| sed -E 's/[^0-9]//g') <(seq 1 13) \| wc -l` → `0`。`grep -cE '^- 来源：multica:'` / `^- 工作量：(S\|M\|L)$` / `^- 档：(执行记录\|仅声明)$` / `^- 落点：(taskboard:\|新建 \|不适用$)` 各 → `13`。 |
| ④ 来源路径真实 | 做到 | 议题原文 `grep -oE 'multica:[^ |:)）]+' … \| sed 's/^multica://' \| sort -u \| while read p; do git -C /Users/happy/projects/multica-upstream cat-file -e 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:"$p" 2>/dev/null \|\| echo "MISSING $p"; done \| wc -l` → `0`。循环无 `MISSING`。unique 文件 14 条（`multica:` 引用 19 处，行号被判据剥掉）逐条 `cat-file -e` 皆 `e=0`。 |
| ⑤ 落点真实或新建 | 做到 | 议题原文 `grep -E '^- 落点：taskboard:' … \| sed -E 's/^- 落点：taskboard:([^ :]+).*/\1/' \| sort -u \| while read p; do git cat-file -e ebbcd47:"$p" 2>/dev/null \|\| echo "MISSING $p"; done \| wc -l` → `0`。3 条 `taskboard:` 路径（`docs/agents/coordinator.md` `server/app.mjs` `server/database.mjs`）皆 `e=0`。另有 `新建 web/src/components/InboxView.tsx` / `CommandPalette.tsx` / `web/src/shortcuts.ts` 与 4 条 `不适用`。`git rev-parse ebbcd47` → `ebbcd473b09b19830d8e7a1826effe9cd52d8be0`。 |
| ⑥ 六环表 + 对照 | 做到 | `sed -n '/^## agent 触发链$/,/^## 集成$/p' … \| grep -E '^\| (触发\|准入\|领取\|执行\|流回\|回写) \|' \| grep -c 'multica:'` → `6`。六行第二列均 `multica:<path>:<line>`。`sed -n '/^### 对照 taskboard$/,/^## 集成$/p' … \| grep -cE '^- '` → `3`（≥ 3）；三条分别对派发 / 盯场 / 验收与 PR。 |
| ⑦ 集成与限流判定 | 做到 | `grep -cE '^- (GitHub\|Slack\|webhooks\|限流)：(执行记录\|仅声明\|未找到)$'` → `4`。`## 集成` 节：GitHub / Slack / webhooks 皆「执行记录」，同节 F10–F12 给路径；`## 限流` 节：「限流：执行记录」，同节 F13 给路径。 |
| ⑧ 收尾 + 零触碰 | 半做 | 格式命令全过：`sed -n '/^## 最值得先抄的 3 条$/,/^## 我没能确认的$/p' … \| grep -cE '^[123]\. F[0-9]+：'` → `3`；`sed -n '/^## 我没能确认的$/,/^## 取值$/p' … \| grep -cE '^- '` → `2`（≥ 1）；`grep -cxF '无'` → `0`；`grep -c 7a438bd5b8bf39afd54259a7eb0971390e50a8ef` → `33`（≥ 2）；`grep -cE '^multica porcelain (前\|后)：0$'` → `2`；四行原文在 `## 取值`。本席亲跑：`git -C /Users/happy/projects/multica-upstream rev-parse HEAD > /Users/happy/projects/taskboard/.scratch/d7-native/review-logs/mu-rev-parse.txt 2>&1; e=$?` → `e=0`，内容 `7a438bd5b8bf39afd54259a7eb0971390e50a8ef`；`git -C /Users/happy/projects/multica-upstream status --porcelain \| wc -l` → `0`。不达：议题 ⑧「正文出现的每个计数 / 版本串在 `## 取值` 节有对应命令行」——F5「2 MB 预览上限」、未确认「735 行」「918 行」无命令（见抽核 0）。 |

Out of scope：

- 不改 taskboard 其他文件、不改 #5 报告：`git diff --name-only 935c954..87db745` 仅 `docs/research/D7/multica-reference-2.md`。没做错。
- 不改 `/Users/happy/projects/multica-upstream`：HEAD 仍钉 `7a438bd5…`，porcelain `0`。没做错。
- 不写 ADR、不立后续议题：全文无 `ADR-`。F 正文有落点向的「引入 / 新建」一句（格式要求），未写成实施方案。没做错。
- 不与其他产品比较：`grep -niE 'Linear|Jira|Notion|Asana'` 空。没做错。
- 不重写 #5 的 20 条：无 `D5 F` 重写；七面均为 D5 未覆盖主题。没做错。
- docs-only：本席未 `npm install` / `npm run check`。没做错。

Worst within Spec: ⑧ 半做（计数无命令）。

## 归店与脱敏

归店：`git diff --stat 935c954..87db745` → `docs/research/D7/multica-reference-2.md | 166 ++++++++++++++++++++++++++++++++` / `1 file changed, 166 insertions(+)`，恰 1 文件。实现 commit message 为 `docs(research): D7 multica reference report part 2 (#7)`。

任务书 D7-research「我已经跑过的」块数字（`5162` / `v0.4.40` / `668672` / `434802` / `1804` / `2321` / `1336` / `15903` / `2627` / `2026-09-05`）在交付物中均为 0 次；未把协调席取值写成自跑。`## 取值` 列出本机 `rev-parse` / `porcelain` / `git show <sha>:<path>` 与 `e=$?`（22 条）。

脱敏：无 token / 密钥 / `ghp_` / `AKIA` / 私钥头。仓外绝对路径只有允许的 `/Users/happy/projects/multica-upstream` 与 `/Users/happy/projects/taskboard/.scratch/d7-native/logs/`。

另核：审查开始时 `git rev-list --count 935c954..HEAD` = **1**；pathspec 无越界。`git branch -r --list 'origin/spec/7'` 空；`git ls-remote --heads origin spec/7` 空（未 push）。`git log --format=%b 935c954..87db745 | grep -ci co-authored` → **0**。`git status --porcelain` 审查开始时 0 行。

## 证据强度抽核

0. **计数复现（全量）**：`## 取值` 22 条命令在钉定 commit 上逐条重跑，取值如下（报告取值 → 本席）。

| 命令 | 报告 | 本席 |
|---|---|---|
| cmd_1 `rev-parse HEAD` | `7a438bd5…` / e=0 | `7a438bd5b8bf39afd54259a7eb0971390e50a8ef` e=0 |
| cmd_2 `status --porcelain \| wc -l` | 0 / e=0 | **0** e=0 |
| cmd_3 `…001_init.up.sql \| grep -n "CREATE TABLE inbox_item ("` | `110:CREATE TABLE inbox_item (` | 同 e=0 |
| cmd_4 `…inbox-page.tsx \| grep -n "deduplicateInboxItems"` | `28:  deduplicateInboxItems,` | 首条同；另有 `128:  const items = useMemo(() => deduplicateInboxItems(rawItems), [rawItems]);` |
| cmd_5 `…001_init.up.sql \| grep -n "CREATE TABLE issue_dependency ("` | `89:CREATE TABLE issue_dependency (` | 同 e=0 |
| cmd_6 `…storage.go \| grep -n "type Storage interface {"` | `9:type Storage interface {` | 同 e=0 |
| cmd_7 `…file.go \| grep -n "const maxUploadSize"` | `36:const maxUploadSize = 100 << 20 // 100 MB` | 同 e=0 |
| cmd_8 `…command.tsx \| grep -n "function Command("` | `20:function Command({` | 同 e=0 |
| cmd_9 `…definitions.ts \| grep -n "export type ShortcutActionId ="` | `8:export type ShortcutActionId =` | 同 e=0 |
| cmd_10 `…task.go \| grep -n "func (s \\*TaskService) EnqueueTaskForIssue("` | 表行 :1103 / e=0 | `1103:func (s *TaskService) EnqueueTaskForIssue(...)` e=0 |
| cmd_11 `…agent_ready.go \| grep -n "func AgentReadiness("` | 表行 :105 / e=0 | `105:func AgentReadiness(...)` e=0 |
| cmd_12 `…daemon.go \| grep -n "func (h \\*Handler) ClaimTaskByRuntime("` | 表行 :3329 / e=0 | `3329:func (h *Handler) ClaimTaskByRuntime(...)` e=0 |
| cmd_13 `…execenv.go \| head -1` | 表行 :1 / e=0 | `// Package execenv manages isolated per-task execution environments for the daemon.` e=0 |
| cmd_14 `…daemon.go \| grep -n "func (h \\*Handler) ReportTaskMessages("` | `4611:func (h *Handler) ReportTaskMessages(...)` | 同 e=0 |
| cmd_15 `…task.go \| grep -n "func (s \\*TaskService) CompleteTask("` | 表行 :4311 / e=0 | `4311:func (s *TaskService) CompleteTask(...)` e=0 |
| cmd_16 `…task.go \| grep -n "func (s \\*TaskService) ClaimTask("` | `3473:func (s *TaskService) ClaimTask(...)` | 同 e=0 |
| cmd_17 `…github.go \| grep -n "type GitHubInstallationResponse struct {"` | `54:type GitHubInstallationResponse struct {` | 同 e=0 |
| cmd_18 `…channel.go \| grep -n 'const TypeSlack channel.Type = "slack"'` | `19:const TypeSlack channel.Type = "slack"` | 同 e=0 |
| cmd_19 `…webhook_delivery.go \| grep -n "type WebhookDeliveryResponse struct {"` | `26:type WebhookDeliveryResponse struct {` | 同 e=0 |
| cmd_20 `…ratelimit.go \| grep -n "var rateLimitScript = redis.NewScript("` | `19:var rateLimitScript = redis.NewScript(` | 同 e=0 |
| cmd_21 `git grep -n "message_rate" server/internal/realtime/` | e=1 | **e=1** 空输出 |
| cmd_22 `git grep -n "issue_dependency" packages/views/` | e=1 | **e=1** 空输出 |

正文有数字而 `## 取值` 无对应命令（**必修**）：

| 正文数字 | 报告取值 | 本席 |
|---|---|---|
| F5「2 MB 预览上限」 | 无命令 | `server/internal/handler/file.go` L53 `const maxPreviewTextSize = 2 << 20 // 2 MB`（数字属实；cmd_7 只打到 L36 的 100 MB） |
| 未确认「735 行日志」 | 无命令 | `hub.go` L735 `slog.Warn("ws: pre-auth frame exceeded read limit", "limit_bytes", inboundReadLimit)`（属实） |
| 未确认「918 行警告」 | 无命令 | `hub.go` L918 `slog.Warn("ws: inbound frame exceeded read limit",`（属实） |

22 条已列命令均可复现；以上三处无命令 = 抽核 0 必修。未确认里的 `hub.go` / `workspace_delete.sql` 无 `multica:` 前缀，不进 ④ 循环；`cat-file -e` 二者皆 `e=0`，不是编路径。

1. 抽 5 条「执行记录」F（`git -C /Users/happy/projects/multica-upstream show 7a438bd5…:<path> | sed -n '<line-3>,<line+3>p'`）：
   - **F1** `001_init.up.sql:110`（sed 107,113）：`CREATE TABLE inbox_item (` 在 110。同表随后 `CHECK (severity IN ('action_required', 'attention', 'info'))` 与 `read` / `archived`。机制在。正文 grep 取值 `110:` 与本席一致。
   - **F5** `file.go:36`（sed 33,39）：`const maxUploadSize = 100 << 20 // 100 MB` 在 36；上一窗已是 `extContentTypes` 的 `.wasm` 项。机制在。2 MB 在 **53**（见抽核 0）。
   - **F7** `definitions.ts:8`（sed 5,11）：`export type ShortcutActionId =` 在 8。正文「`ShortcutActionDefinition` 注册表 / Cmd vs Ctrl」在 **52** / **36–40**。机制在文件内；来源行是类型别名不是定义（建议级行号）。
   - **F8** `task.go:3473`（sed 3470,3476）：`func (s *TaskService) ClaimTask(...)` 在 3473，注释写 atomically claims。机制在。正文 grep 取值与本席一致。
   - **F13** `ratelimit.go:19`（sed 16,22）：`var rateLimitScript = redis.NewScript(\`` 在 19，Lua `INCR` + `EXPIRE`。机制在。
   五条路径均存在，无一「路径不存在」。

2. 抽「仅声明」F：全文 **0** 条（不足 2 条可抽）。七面全标「执行记录」。没写「仅声明」检索 = 建议级（抽核项不够 2）。

3. 「最值得先抄的 3 条」编号 F1 / F5 / F7 均有对应 `### F<n>`。理由：F1 落在协调席读屏获知 agent 完成/报错（一人 + agent）；F5 落在 `server/app.mjs` 数行补齐体积截断（20k 单体小表面）；F7 落在 `App.tsx` 散落快捷键归拢。不是泛泛的「好」。

4. 「我没能确认的」抽第 1 条：WS 每连接滑动窗口限流。F13 论证的是 HTTP Redis 限流，不是 WS 消息频率；该条写清核到 `inboundReadLimit` 帧大小、`message_rate` grep e=1。本席复现 cmd_21 e=1，与「没确认每连接频率限流」一致，不是自相矛盾。第 2 条：`issue_dependency` 前端独立编辑。F3 只论证表 + 父任务看板折叠，未声称前端 blocks 编辑器。本席 `git grep -n "issue_dependency" packages/views/` e=1，`packages apps` 亦 e=1；`workspace_delete.sql` 确有 `DELETE FROM issue_dependency`（L354）。作为未确认可成立。

## 局限

- **必修（抽核 0 / ⑧）**：正文 F5「2 MB 预览上限」、未确认「735 行」「918 行」三处数字无 `## 取值` 命令。本席在钉定 sha 核到数字属实，仍按「无命令 = 必修」定级。
- 行号偏差（建议级，机制均在文件内）：六环「执行」`execenv.go:1` 的 `head -1` 是包注释，Skills / MCP 注入在同文件更后（如 L62 `McpConfig`、L157 `AgentSkills`）；F7 来源 :8 是 `ShortcutActionId`，`ShortcutActionDefinition` 在 **52**。
- F6 来源 `command.tsx:20` 是 `cmdk` 原语封装（`import { Command as CommandPrimitive } from "cmdk"` 在 L4）；正文「任务跳转、主题切换」不在 ±3 窗内（建议级过述）。
- F12 正文写 HMAC / `webhook_delivery_worker`：来源 `webhook_delivery.go:26` 是 `WebhookDeliveryResponse`（含 `SignatureStatus` / `ReplayedFromDeliveryID`）；HMAC-SHA256 在 `autopilot_webhook.go:263–275`；Go 符号是 `WebhookDeliveryWorker`（建议级挂点偏移，机制在仓内）。
- 明显遗漏（建议级）：`## 命令面板与深链` 有面板与快捷键 F，无 URL 深链 F（议题点名「命令面板 / 快捷键 / URL 深链」；inbox 页确有 `searchParams.get("view")`，可写成阴性或薄 F）。
- 仅声明 0 条，抽核第 2 项不够 2 条（建议级）。
- 未跑 `git push`。未改交付物或任何别的文件（本 VERDICT 除外）。未碰 multica-upstream 工作区。未 `npm install` / `npm run check`。
