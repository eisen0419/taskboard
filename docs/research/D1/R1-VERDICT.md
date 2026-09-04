FAIL
reviewedHead: 31f35acd24f8ada36243d8eb9ea517be0b86ecb7
fixedPoint: 2bbe2dde8338e949097ebb5f84c81dbcf848bf64
diffCommand: git diff 2bbe2dde8338e949097ebb5f84c81dbcf848bf64..HEAD
commits: 31f35ac refactor: remove Codex-only subsystems (#1)
implReport: /Users/happy/projects/taskboard/.teams/d1/reports/task-1.980d599d-d65e-4c24-9f76-66a8502c63d1.md
specSource: https://github.com/eisen0419/taskboard/issues/1 （验收 6 + Out of scope 5 + 评论 D30/ESCALATION-67）
conclusion: 逐条核过（命令与取值见下；未开浏览器点四视图，见「局限」）

逃避与拧松清单：命中第 1 项（清单外整文件删除的 N/N 抽核不成立）→ 必修级 FAIL。其余 2–5 项为 0。

## Standards 轴

汇总：report 的 `npm run check` / 计数取值方式符合 orca-lab `CODING_STANDARDS.md` §2/§3；代码层三件（死引用、`@ts-ignore`/`any` 化、注释掉当删除）符合。硬违反 1：§2「验收看断言实参，不只看 describe / it 结构」——report 把 `test/issue-composer-wiring.test.mjs` 写成 3/3 覆盖被删面，未对断言对象。判断调用 3（单元素 `for`、未读的 `dragRegionRef`、无 JSX 引用的 `.codex-sidebar-*` CSS）。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 违反（取值 3/3）；其余符合 | report 用 `npm run check > /tmp/check-d1-final-31f35ac.log 2>&1; e=$?`（无管道取退出码）。本席重跑 `npm run check > /tmp/check-r.log 2>&1; e=$?` → `e=0`，`ℹ tests 121` / `ℹ pass 121` / `ℹ fail 0`，Vitest `Tests 9 passed (9)`，与 report 一致。`issue-composer-wiring` 的 3/3 未看第 2 个 `test()` 的实参（见 Spec / 逃避清单）。新哨兵/变异：不适用。 |
| §3 本机工具陷阱 | 符合 / 其余不适用 | 计数用议题指定的 `grep -cE` / `git grep -lE`（ERE 里 `$` 是行锚，不是 ugrep 字面 `$` 陷阱）。无 awk `==`、无 `ps \| grep`、无 `pgrep -f` 等待环。 |
| §6 测试与断言 | 符合 | 未新增 `.skip`/`.only`、未把期望值改宽、未在保留测试判定链上加 mock。`InlineMediaComposer.test.tsx` 留下的 round-trip 用例期望值仍是字面 marker，不是从被测函数拼出来的。 |
| 死引用 | 符合 | `git grep -lE "$(cat docs/briefs/D1-ref-re.txt)" -- server shared cli web/src scripts \| wc -l` → `0`。 |
| `@ts-ignore` / `@ts-nocheck` / `any` 化 | 符合 | `git diff 2bbe2dde..HEAD` 无 `+` 行含 `@ts-ignore`/`@ts-nocheck`/`as any`。现存 `InlineMediaComposer.tsx:2252,2258` 的 `as unknown as ReactKeyboardEvent` 不在本 diff 新增行。 |
| 删除变注释 | 符合 | 新增行无把原 import/test/function 改成注释。 |

基线 smell（判断调用，非硬违反）：`test/pr-review-regressions.test.mjs` 删 Cloud 臂后仍 `for (const listQuery of [localListQuery])`；`web/src/App.tsx:508,1991` `dragRegionRef` 只挂不读；`web/src/styles.css` 仍有 `.codex-sidebar-expand-button` / `.codex-link-row` 且 TS/JSX 0 引用。

Worst within Standards: report 对清单外整删文件的 3/3 取值（§2）。

## Spec 轴

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 5 条均未做错（命名 / 枚举 / 四视图业务 / 未加功能 / 受保护路径）。必修级失败不在这 6 条产品行为，而在 D30 对清单外测试整删的 N/N 抽核（逃避清单 1）。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 文件层 | 做到 | `git ls-files \| grep -cE "$(cat docs/briefs/D1-del-re.txt)"` → `0`（基线 8eff36f 为 235 文件 / 清单 110；merge-base 242 文件）。额外整删 5 个且 report 已列：`shared/executable-command.mjs`、`shared/process-tree.mjs`、`test/helpers/cloud-worker-harness.mjs`、`test/issue-composer-wiring.test.mjs`、`web/src/components/IssueMentionMenu.tsx`。`comm` 对照：清单 110 全部删除，无漏删。 |
| ② 引用层 | 做到 | `git grep -lE "$(cat docs/briefs/D1-ref-re.txt)" -- server shared cli web/src scripts \| wc -l` → `0`。 |
| ③ 依赖与脚本 | 做到 | `grep -cE "$(cat docs/briefs/D1-pkg-re.txt)" package.json` → `0`；`build` 只剩 `vite build --config web/vite.config.ts`。`package-lock.json` 在同一 commit（`git diff --name-only 2bbe2dde..HEAD -- package-lock.json` 有记录）。tracked porcelain：`git status --porcelain --untracked-files=no` → 0 行。 |
| ④ 数据层 | 做到 | `grep -cE 'ai_chat_\|jira\|JIRA' server/database.mjs` → `0`；`shared/domain.mjs` → `0`。无 `ai_chat_threads/runs/events` / `project_summaries` 建表；仅删 `JIRA_PROJECT_ID`。冒烟用 `.scratch/fixtures/taskboard-12.sqlite` 复制进临时 DATA_DIR：`curl -s http://127.0.0.1:47998/api/tasks` → tasks **12**。 |
| ⑤ 验证入口 | 做到 | 先 `npm install > /tmp/npm-d1r.log 2>&1; e=$?` → `0`。`npm run check > /tmp/check-r.log 2>&1; e=$?` → `e=0`；node `--test` `# tests 121` / `# pass 121` / `# fail 0`（373→121）；vitest `9 passed`。typecheck/build 均过，`test -f dist/web/index.html` → 0。 |
| ⑥ 冒烟 | 做到 | 端口 **47998**（未碰 47823 / 主仓 `.data/`）：health=`{"status":"ok"}`；`CODEX_THREAD_ID=t CODEX_TASKBOARD_URL=http://127.0.0.1:47998 node cli/taskctl.mjs project list --json` 含 `"projects"`；`curl -s http://127.0.0.1:47998/ \| grep -c 'id="root"'` → `1`；进程已停，47998 空闲。 |

Out of scope：

- 不改名：`grep -c '"name": "codex-taskboard"' package.json` → `1`；`CODEX_*` / `thread_codex_*` / 监听日志「Codex Taskboard」仍在。没做（正确）。
- `shared/domain.mjs` 枚举：diff 只删 `JIRA_PROJECT_ID`。没做（正确）。
- 四视图：`App.tsx` 仍挂 dashboard / issues / list / gantt / readme。仪表盘只删 AI 摘要块（`getProjectSummary` / `.dashboard-codex-summary`）。甘特/头像 PNG→`ai-launcher.svg` 是清单内 `web/public/codex-*.png` 删除后的挂点，不是另改交互。列表/卡片去掉 `task.source === "jira"` disable 是验收④ Jira 特判。没做错。
- 未加功能；`threadBinding` 与 actor 头仍在（`server/app.mjs` 仍解析 `X-Taskboard-User-*`；`test/server.test.mjs` 仍有 remote binding 用例）。Codex 进程侧 `/api/local/host-runtime` / Jira / cloud / AI 路由已删。`/api/meta` 现返回 `{}`（见局限）。
- 受保护路径：`git diff --name-only 2bbe2dde..HEAD -- docs/briefs docs/agents AGENTS.md CLAUDE.md LICENSE` 空；`git show --stat HEAD \| grep -cE '^ (docs/briefs\|docs/agents\|AGENTS\.md\|CLAUDE\.md\|LICENSE)'` → `0`。

D30 / 逃避清单 1（必修）：`test/issue-composer-wiring.test.mjs` 不在验收①正则内。report 表写「整文件删除，3/3 用例覆盖 candidate API、AiChat rebind 与新会话 host bridge」。对 `8eff36f` 原文抽核：

1. `all four issue composers request candidates…` → `completionContext` / candidate 挂点（被删面）——成立。
2. `task composer document converts only durable references…` → 唯一生产符号是 `buildPersistedTaskComposerDocument`（`web/src/taskConversations.ts`）。基线 `git grep` 生产调用方为 **0**（只有该测试 import）；不是 AiChat/rebind/host。report 的 3/3 不实。
3. `open in new conversation bypasses AI chat…` → `/api/local/ai/composer/rebind` + `AiChat.tsx`——成立。

「清单外整文件删除：仅当 report 写明 N/N 且抽核成立才不算」→ 抽核不成立 → **命中**。议题验收未要求整删该文件（D30 原文要求不整删，除非 N/N 成立）。

Worst within Spec: 上条（D30 N/N 抽核失败）。产品 6 条本身做到。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD`）：

1. 断言删除：保留测试里含 `assert|expect` 的删除行均能对上 report 表，且对应面在验收①（抽核 `8eff36f` 行号：`actor-identity` 8-10/32/46-50/54-59/72-86、`board-interactions` 133-134/153、`issue-assignee` 38、`issue-relations` 12-13/59-71、`pr-review-regressions` 9-12/37-48/56、`project-home` 6/13-40/96/109-116/122、`server.test.mjs` 9/86-100/102-106/112-118/410-428/521-645/893-920、`task-project-move` 93-132、`InlineMediaComposer.test.tsx` 1-101/128-373）。无 `.skip(` / `.only(` / 把期望改宽。整文件删除：清单内 21 个测试文件不算；清单外 `issue-composer-wiring.test.mjs` **命中**（见上）；`test/helpers/cloud-worker-harness.mjs` 为 Cloud 测试 harness、Cloud 测试已删、零 import，算死代码。
2. 守卫：无新增 `|| true`、无新增空 `catch`。
3. 门禁：commit message 无 `--no-verify`/`--force`。`.github/` 整删（`git ls-files .github` 空）= 验收①，不算。
4. 判据：`docs/briefs/**` `docs/agents/**` `AGENTS.md` `CLAUDE.md` 无 diff。
5. 验证替代：保留测试无新增 mock/stub 落到被测判定链。

清单 2–5 项全 0；第 1 项因清单外整删抽核失败命中。

其它：

- `npm run check`：e=0；`# tests 121` / `# pass 121` / `# fail 0`；vitest 9 passed。与 report 一致。
- 冒烟六步端口 47998：health ok / tasks=12 / project list 含 projects / root-count=1 / 自停。
- `git ls-files | grep -cE "$(cat docs/briefs/D1-del-re.txt)"` = 0；`git ls-files | wc -l` = **127**（写单时 235 在 `8eff36f`；merge-base 242 − 115 删除 = 127，合理）。
- `grep -c '"name": "codex-taskboard"' package.json` = 1。
- `git show --stat HEAD | grep -cE '^ (docs/briefs|docs/agents|AGENTS\.md|CLAUDE\.md|LICENSE)'` = 0。
- `git rev-list --count $(git merge-base origin/main HEAD)..HEAD` 在审查开始时 = **1**（实现 commit）。
- `git branch -r --list 'origin/spec/1'` 为空（未 push）。
- `git log --format=%b $(git merge-base origin/main HEAD)..HEAD | grep -ci co-authored` = **0**。
- `git status --porcelain` = 1 行 `?? .orca-claims/`（协调席持有，实现 report 已记；tracked 面 0 行）。本席未改、未删、未纳入提交。

## 局限

- 未在浏览器里点击看板/列表/甘特/项目文档；四视图结论来自 `App.tsx` 挂点、各视图 diff、以及仍通过的 board/project-home 源码断言。反例未找到，但不能当成交互级亲验。
- `test/issue-composer-wiring.test.mjs` 第 2 用例的被测函数基线就无生产调用方；本 commit 把它从 `taskConversations.ts` 删掉。marker round-trip 仍由 `InlineMediaComposer.test.tsx` 覆盖。这不把产品 6 条打成「没做」，只把 D30 N/N 与逃避清单打成命中。
- 建议级残留（不升级 FAIL）：`GET /api/meta` 现 `{}`；`development-contexts` 仍读 `codexStatePath` / `chat_processes.json`；`dataset.embedded = "false"` + 空 `workspace-drag-region`；无引用的 `.codex-sidebar-expand-button` / `.codex-link-row` CSS；`actor-identity` 整删「host identity forwarding」时顺带拿掉仍存在的 `X-Taskboard-User-*` 源码断言（运行时头仍在，且 `Codex-hosted user mutations persist…` 用例仍过）。
- `InlineMediaComposer.test.tsx` 不在默认 `test:components` 入口（该脚本基线就只跑 `MarkdownDocument.test.tsx`）；本席未把它算进 vitest 9。
- 未跑 `git push`。未 kill / 重启 `teams-orca`，未改 `.teams/` 驱动态，未碰 47823 与主仓 `.data/`。
