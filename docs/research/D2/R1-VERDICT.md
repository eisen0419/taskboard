PASS
reviewedHead: a6c2ce7afa5de4018ea418058809395647bce00d
fixedPoint: 348ff191c7925c9377e7800c5bf8fdc1418f47ff
diffCommand: git diff 348ff191c7925c9377e7800c5bf8fdc1418f47ff..a6c2ce7afa5de4018ea418058809395647bce00d
commits: a6c2ce7 refactor: rename Codex naming to Taskboard (#2)
implReport: /Users/happy/projects/taskboard/.teams/d2/reports/task-1.73682703-f5ec-4ff3-8058-b88e0b12e485.md
specSource: https://github.com/eisen0419/taskboard/issues/2 （验收 6 + Out of scope 4 + Fable 勘正：④ 列名、`CODEX_AGENT_ACTOR` 是常量、A/B 两处删）
conclusion: 逐条核过（命令与取值见下；未开浏览器点四视图，见「局限」）

逃避与拧松清单：清单 5 项全 0。

## Standards 轴

汇总：代码层三件（改名四层一致、无 `@ts-ignore`/`any` 化、lock 只改 name）符合；report 取值方式对照 orca-lab `CODING_STANDARDS.md` §2/§6 符合、§3 违反（字面 `grep` 未加 `-F`，针里无 `$`，本席用 `grep -F` 重跑计数相同）。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d2r.log 2>&1; e=$?` → `0`；`npm run check > /tmp/check-r.log 2>&1; e=$?` → `e=0`，`ℹ tests 121` / `ℹ pass 121` / `ℹ fail 0`，Vitest `Tests 9 passed (9)`，与 report 一致。report 期望表对到断言实参（A 改写 `test/server.test.mjs:349-363` 的 `workspacePath: null` / `contexts: []`）。新哨兵/变异：不适用。 |
| §3 本机工具陷阱 | 违反（report 字面 grep 无 `-F`）；本席重跑符合 | report 用 `grep -c '"name": "taskboard"'`、`grep -ci codex`、`grep -c '<title>Taskboard</title>'`、`grep -ci co-authored`，均未 `-F`（`CODING_STANDARDS.md` §3；针无 `$`，ugrep `$` 陷阱未触发）。`grep -c '"creatorId": *"agent"'` 是 ERE（`*`），`-F` 不适用。本席 `grep -cF '"name": "taskboard"' package.json` → `1`；lock → `2`；`grep -ciF codex README.md` / `README.zh-CN.md` 各 `0`。无 awk `==`、无 `ps \| grep`、无 `pgrep -f` 等待环。 |
| §6 测试与断言 | 符合 | 未新增 `.skip`/`.only`（`git diff 348ff191..a6c2ce7 -- test \| grep '\.skip(\|\.only('` 空）。期望值按改名表换字面量；A 那条按任务书改写判定形状（豁免）。`test/` 无新增 `mock`/`stub`/`vi.fn`。`test/issue-assignee.test.mjs:24` 仍是字面 `/AGENT_ACTOR/`。 |
| 改名一致 | 符合 | 四词 `git grep -n`：`agentProjectId` 在 server（`app.mjs:408+` / `database.mjs:45`）、cli（`taskctl.mjs:850,871`）、web（`types.ts:41` / `taskConversations.ts:50`）、test（`server.test.mjs:642` / `cli.test.mjs:421`）；`thread_agent_host_id` 仅 `server/database.mjs` 19 处（JSON 层用 `agentHostId`）；`TASKBOARD_THREAD_ID` 在 cli（`taskctl.mjs:1023-1029`）与 test（`cli.test.mjs` / `project-readme.test.mjs`）；`AGENT_ACTOR` 在 server（`app.mjs:36`）、web（`actors.ts:3`）、test（`issue-assignee.test.mjs:24`）。旧名 `codexProjectId` / `thread_codex_host_id` / `CODEX_THREAD_ID` / `CODEX_AGENT_ACTOR` 在 server/cli/web/test 为 0。 |
| `@ts-ignore` / `@ts-nocheck` / `any` 化 | 符合 | `git diff 348ff191..a6c2ce7 -- '*.ts' '*.tsx'` 的 `+` 行无 `@ts-ignore`/`@ts-nocheck`/`\bany\b`。 |
| lock 只变 name | 符合 | `git diff 348ff191..a6c2ce7 -- package-lock.json \| grep -cE '^[-+] '` → `4`（L2 / L8 `"name": "codex-taskboard"` → `"taskboard"`）。 |

基线 smell（判断调用，非硬违反）：无。跨文件改名由议题要求，不判 Shotgun Surgery。A/B 删除是勘正要求，不判 Speculative Generality。`.thread-link-row` / `.thread-context` / `.sidebar-expand-button` 在 `web/src/styles.css` 已改名，TSX 0 引用（D1 已记这些 CSS 基线无引用）——建议级，见局限。

Worst within Standards: report 字面 `grep` 未加 `-F`（§3）。计数仍可信。

## Spec 轴

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 4 条均未做错。A/B 删对了，未删多。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 全仓无 codex | 做到 | Fable 命令 `git grep -il codex -- . ':!docs/briefs' ':!docs/agents' ':!docs/research' \| wc -l` → `0`。不加 `docs/research` 排除时为 `2`（`docs/research/D1/R1-VERDICT.md` / `R2-VERDICT.md`），正是勘正要排除的审查叙述。 |
| ② 包名 | 做到 | `grep -cF '"name": "taskboard"' package.json` → `1`；lock 同针 → `2`（L2、L8）。`bin.taskctl` 仍 `./cli/taskctl.mjs`（`git diff 348ff191..a6c2ce7 -- package.json` 只改 `name`）。 |
| ③ 环境变量 | 做到 | `git grep -lE 'CODEX_[A-Z_]+' -- server shared cli web/src scripts test \| wc -l` → `0`。常量是 `AGENT_ACTOR`（`server/app.mjs:36`、`web/src/actors.ts:3`），不是 `TASKBOARD_ACTOR`。冒烟：`TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=$D node server/index.mjs` → `/health` = `{"status":"ok"}`；`TASKBOARD_THREAD_ID=t TASKBOARD_URL=http://127.0.0.1:47998 node cli/taskctl.mjs project list --json \| grep -c '"projects"'` → `1`；不带 `TASKBOARD_THREAD_ID` 的 `issue create` `e=2`，stderr `grep -cF USAGE_ERROR` → `1`，`grep -ciF codex` → `0`。 |
| ④ 列 / 字段 / 类型 / CLI | 做到 | `git grep -c thread_agent_project_id -- server/database.mjs` 等三列各 `19`；`thread_codex_*` / `origin_codex_*` / `codex_thread_id` = 0。JSON `agentProjectId/Kind/HostId`；类型 `AgentProjectIdentity` / `AgentThreadBinding`（`web/src/types.ts:40-47`）；`AssigneeTarget` `"agent"`（`types.ts:15`、`IssueListView.tsx:155`）。CLI `--binding-agent-project-id` / `-kind` / `--binding-agent-host-id`（`cli/taskctl.mjs:84-86`）。勘正后的 ④ 判据：带 `TASKBOARD_THREAD_ID` 的 `issue create --json`，`grep -c '"creatorId": *"agent"'` → `1`（返回 `"creatorId":"agent"` / `"creatorName":"Agent"`）。 |
| ⑤ 产品名与文案 | 做到 | 服务首行 `Taskboard listening on http://127.0.0.1:47998`；`head -1 $D/s.log \| grep -ciF codex` → `0`；`curl -s http://127.0.0.1:47998/ \| grep -cF '<title>Taskboard</title>'` → `1`；`web/index.html:12` `<title>Taskboard</title>`。握手 `x-taskboard-challenge` / `x-taskboard-proof`，`product: "taskboard"`（`server/app.mjs:1060-1090`）。角标 `text("会话", "Thread")`（`TaskConversationMenu.tsx:144`）。 |
| ⑥ README + 回归 | 做到 | `grep -ciF codex README.md` / `README.zh-CN.md` 各 `0`；`wc -l` 各 `32`（≤80）。五要素 `grep -n`：是什么 `README.md:3` / `README.zh-CN.md:3`；本地运行 `8-10`（`npm install` / `npm run build` / `npm start`）；taskctl 三例 `18-20`；`TASKBOARD_HOST` `27`、`TASKBOARD_THREAD_ID` `28`；上游 `chuspeeism/dashi-taskboard` `30` + MIT `32`。`npm run check` 121/121/0 且 vitest 9。 |

Out of scope：

- 状态 / 优先级中文文案与默认标签：`git diff 348ff191..a6c2ce7 -- shared/domain.mjs web/src/labels.ts` 空。`BoardColumn.tsx:13-19` 仍是 待立项 / 等待认领 / 处理中 / 等你确认 / 遇到阻碍 / 完成 / 取消。没做（正确）。
- 不删功能、不改路由路径：pathname 集合与 base 相同（`/api/projects/:id` / `labels` / `readme` / `development-contexts` / `/api/tasks` / `events` / `comments` / `attachments` / `tree` / `archive|restore|move` 等）。`/api/local/*` 在 base `348ff191` 已不存在，本 diff 未改路径。`development-contexts` 路由保留。没做错。
- 旧库迁移：`git grep -n -iE 'thread_codex|ALTER TABLE.*RENAME COLUMN' -- server` → `0`。`ADD COLUMN thread_agent_*` 是原 `ensureColumn` 循环改名，不是 `RENAME COLUMN`。`.data/**` 不在 commit。没做（正确）。
- 受保护路径：`git diff --name-only 348ff191..a6c2ce7 -- docs/briefs docs/agents docs/research AGENTS.md CLAUDE.md LICENSE .teams-orca*.json` 空；`git show --stat HEAD \| grep -cE '^ (docs/briefs|docs/agents|docs/research|AGENTS\.md|CLAUDE\.md|LICENSE|\.data/|\.scratch/|\.orca-claims/)'` → `0`。

A/B（删对了 = 做到；删多了 = 做错）：

- A 做到：`codexProjectRoot` / `latestThreadCwd` / `CODEX_HOME` / `codexStatePath` / `codexProcessesPath` / `resolveProjectWorkspace` 在 HEAD 为 0。`server/app.mjs:1250-1281` 只认 `workspacePath`，未知查询参数 400；`workspacePath = deviceWorkspacePath ?? project.workspacePath ?? null`。`web/src/api.ts:213-225` 去掉 `codexProjectId` / `codexThreadId` 入参；`App.tsx:987-990` 调用点同步。`test/server.test.mjs:349-363` 改写不删：无参 → 200 + `workspacePath: null` + `contexts: []`；`?workspacePath=` 原样返回。路由未整段删除。
- B 做到：`codex://threads/` / 「请在 Codex App 中打开」/ 「复制终端命令」/ `codex resume` / `CodexResumeIcon` 在 HEAD 为 0。`App.tsx:1685-1691` `openThread` / `openLegacyLocalThread` 均 `copyText(..., "会话 ID 已复制。" / "Thread ID copied.")`。`TaskDetail.tsx:329-333` 按钮为「复制会话 ID」/ "Copy thread ID"，未整颗拿掉。角标「会话」/ "Thread"。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `348ff191..a6c2ce7`）：

1. 断言删除：测试文件未删（`--diff-filter=D -- test` 空）。`^test(` 各文件条数与 base 相同，合计 **121**。含 `assert|expect` 的删除行在 A 改写之外均有配对新增（改名换字面量；B 的「查看对话」→「复制会话 ID」按勘正）。A 原 `test/server.test.mjs` 约 349-380 按任务书改写，不算命中。无新增 `@ts-ignore` / `@ts-nocheck` / `.skip(` / `.only(`。`# tests` = 121。未命中。
2. 守卫：diff 无新增 `|| true`、无新增 `catch`。未命中。（A 删掉的 try/catch 不算。）
3. 门禁：commit message 与 diff 无 `--no-verify` / `--force`。未命中。
4. 判据：`docs/briefs/**` `docs/agents/**` `docs/research/**` `AGENTS.md` `CLAUDE.md` `.teams-orca*.json` 无 diff。未命中。
5. 验证替代：保留测试无新增 `mock`/`stub` 落到被测判定链。未命中。

清单 5 项全 0。

其它：

- `npm run check`：e=0；`# tests 121` / `# pass 121` / `# fail 0`；vitest 9 passed。与 report 一致。`test -f dist/web/index.html` → `0`。
- 机械：`git grep -il codex -- . ':!docs/briefs' ':!docs/agents' ':!docs/research' \| wc -l` = 0；`git grep -lE 'CODEX_[A-Z_]+' -- server shared cli web/src scripts test \| wc -l` = 0；`grep -cF '"name": "taskboard"' package.json` = 1 且 lock = 2。
- 冒烟端口 **47998**（未碰 47823 / 主仓 `.data/`）：全新临时目录 `$D`；health=`{"status":"ok"}`；首行无 codex；`project list --json` `"projects"` 计数 1；`issue create` `"creatorId": *"agent"` 计数 1；不带 `TASKBOARD_THREAD_ID` 时 e=2 / `USAGE_ERROR`=1 / codex=0；`grep -cF '<title>Taskboard</title>'` = 1；已 `kill` 本席 pid，47998 空闲。
- README：见 Spec ⑥。
- 旧库：`git grep -n -iE 'thread_codex|ALTER TABLE.*RENAME COLUMN' -- server` = 0。
- `git show --stat HEAD \| grep -cE '^ (docs/briefs|docs/agents|docs/research|AGENTS\.md|CLAUDE\.md|LICENSE|\.data/|\.scratch/|\.orca-claims/)'` = 0。
- 审查开始时 `git rev-list --count $(git merge-base origin/main HEAD)..HEAD` = **1**（实现 commit `a6c2ce7`）。
- `git branch -r --list 'origin/spec/2'` 为空（未 push）。
- `git log --format=%b $(git merge-base origin/main HEAD)..HEAD \| grep -ci co-authored` = **0**。
- `git status --porcelain` 审查开始时 = **0** 行。

## 局限

- 未在浏览器里点击看板 / 列表 / 甘特 / 项目文档。四视图结论来自 `App.tsx` 仍挂 `dashboard` / `issues` / `list` / `gantt` / `readme`（`BoardView` 与 `DashboardView` / `IssueListView` / `GanttView` / `ProjectReadmeView`），以及仍通过的 board / project-home 源码断言。反例未找到，不能当成交互级亲验。
- 未对 `development-contexts` 未知查询参数打 live 400（代码 `server/app.mjs:1253-1258` 仍过滤非 `workspacePath` 键并抛 `UNKNOWN_QUERY_PARAMETER`）。
- 建议级（不升级 FAIL）：tracked 文件名 `docs/assets/codex-taskboard.png` 仍含 `codex`（`git ls-files \| grep -iF codex`）；不在本 commit 的 diff 里，内容也打不进 `git grep -il`（① 的命令仍为 0）。`.thread-link-row` / `.thread-context` / `.sidebar-expand-button` CSS 已改名但 TSX 0 引用（与 D1 记的无引用 CSS 同源）。
- 未跑 `git push`。未 kill / 重启 `teams-orca`，未改 `.teams/` 驱动态，未碰 47823 与主仓 `.data/`。本席冒烟只用 47998 与临时目录，用完已停。
