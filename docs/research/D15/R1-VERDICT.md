PASS
reviewedHead: eabe4b2e9f79057f8e11158c6fefcc4e1482781d
fixedPoint: 516b369b17813b4ad2dcea288ca7aa7df8f5bcda
diffCommand: git diff 516b369b17813b4ad2dcea288ca7aa7df8f5bcda..eabe4b2e9f79057f8e11158c6fefcc4e1482781d
commits: eabe4b2 feat(inbox): fold unread notifications per task with collapsedCount (#15)
implReport: /Users/happy/projects/taskboard/.scratch/d15-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/15 （验收 6 + Out of scope 4；comments 空；ESCALATION-4 列定义计数 2 / helper 显式 if/else；ESCALATION-5 既有 SSE 用例 5 处字面值）
conclusion: 逐条核过（①–⑤ 命令与取值均为本席亲跑；⑥ 为本席 VERDICT；补充打点 1–6 亲跑；逃避清单对 `516b369..eabe4b2` 机械核；未改交付物、未 push）

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 4 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

Standards 轴 1 条硬违反（impl report ①③ 的 `.emit("inbox.item.created"` 未 `-F`，§3；本席 `grep -c -F` 同 1）+ 1 条判断级（归档排除无单测，本席 extra4 亲跑行为正确）；Spec 轴 0 条 finding。不选总赢家。

## Standards 轴

汇总：折叠只在 `#createInboxItem`；SELECT+UPDATE 落在调用方 `BEGIN IMMEDIATE … COMMIT` 内；severity 用模块级 `INBOX_SEVERITY_RANK`；`emitInboxItem` 收了三处 created 且显式 if/else 两路字面 `.emit(`；迁移照 `PRAGMA table_info` + 缺列才 ALTER；徽标只在 `InboxView`（`App.tsx` 零 diff）。report 退出码无管道。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d15r.log 2>&1; e=$?` → **0**；`npm run check > /tmp/check-d15r.log 2>&1; e=$?` → **0**，`ℹ tests 147` / `ℹ pass 147` / `ℹ fail 0`，vitest `Tests  14 passed (14)`，与 report 一致。新哨兵/变异：不适用。 |
| §3 本机工具陷阱 | 违反（report 字面 grep 部分无 `-F`）；本席重跑符合 | report ③ `grep -c '.emit("inbox.item.created"' server/app.mjs` 未 `-F`（ugrep 下 `.` 是正则；针无 `$`，本席 `grep -c -F` 仍 **1**）。①④ 与 ② 六串 report 用了 `grep -c -F`。无 awk `==`、无 `ps \| grep`、无 `pgrep -f` 等待环。冒烟 `L()` 原 f-string SyntaxError，本席与 impl 同用授权的 `.format(...)`，产品代码未改。 |
| §6 测试与断言 | 符合（归档排除见局限） | 六新用例经 `createTaskboardServer` 真 HTTP（`startServer` `:21-27` / `request` `:30-46`）；期望为字面量（`collapsedCount` 2/1、`kind` `comment_created`、`unreadCount` 1/2）。迁移用例 `DatabaseSync` 预建无 `collapsed_count` 的 `#9` 表（SQL 与 `git show 198b31a:server/database.mjs` 的 `CREATE TABLE IF NOT EXISTS inbox_items` 一致）再 `startServer`（`:491-529`）。无新增 `.skip(` / `.only(` / `@ts-ignore`。未 mock `database` / `EventHub`。归档排除 `archived_at IS NULL`（`:2440`）无单测，本席 extra4 亲跑新行 `collapsedCount` 1、`?state=all` 2 行。 |
| 折叠只在 `#createInboxItem` | 符合 | 规则体 `server/database.mjs:2437-2488`。`#statusChangeInboxItem` `:2420-2434` 与 `createComment` `:2036-2045` 两调用方 two-dot 零改（只走既有返回接法）。 |
| 事务原子 | 符合 | 无内层 `BEGIN`。`createComment` `:2011` `BEGIN IMMEDIATE` → `:2036` `#createInboxItem` → `:2047` `COMMIT`；`updateTask` `:1557`…`:1583`…`:1591`；`moveTask` `:1630`…`:1646`…`:1654`。失败 `ROLLBACK`。折叠 UPDATE 不在事务外补写。 |
| severity 排名常量 | 符合 | 模块级 `INBOX_SEVERITY_RANK` `:24`；`higherSeverity` `:40-42`；唯一调用 `:2453`。无散落 if。 |
| `emitInboxItem` 替换三处 | 符合 | 定义 `server/app.mjs:794-801`（`collapsedCount === 1` → `.emit("inbox.item.created"`；else → `.emit("inbox.updated"`，两分支各自字面事件名，无三元）。调用：评论 `:1486` / PATCH `:1744` / move `:1774`。既有 PATCH item `:1339` `{ item }` 与 read-all `:1317` `{ updated }` 不动。无第四份 created。 |
| 迁移守卫 | 符合 | `:585-588`：`PRAGMA table_info(inbox_items)` + `if (!inboxColumns.some((c) => c.name === "collapsed_count"))` 才 `ALTER TABLE inbox_items ADD COLUMN collapsed_count INTEGER NOT NULL DEFAULT 1`，与 `:580-583` `projects.workspace_path` 同形。 |
| Web 徽标只在 InboxView | 符合 | 徽标 `InboxView.tsx:58-69`；`git diff --stat $base..HEAD -- web/src/App.tsx` 0 行；`InboxView.tsx` `grep -c fetch` → **0**。 |
| Fowler 味道 | 判断调用，非硬违反 | 非 Duplicated Code：折叠只一份。`emitInboxItem` 是议题要求的三处提取，非猜测性抽象。`InboxView.tsx:54` 多包一层 `.inbox-item-badges` + `styles.css:5490-5494` flex 是徽标布局，pathspec 内，建议级。Shotgun Surgery 不适用（允许的 7 文件）。 |

Worst within Standards: report 字面 `grep` 未一律 `-F`（§3）。计数仍可信。归档排除无单测不构成产品缺陷。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `516b369..eabe4b2`（审查开始时实现 commit 恰 1）。任务书 baseSha `a0a605b` 是写单时 main；实际 merge-base 是 briefs commit `516b369`（含 ESCALATION-4/5），two-dot 仍只有实现七文件。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 表与迁移 | 做到 | `grep -c -F 'collapsed_count INTEGER NOT NULL DEFAULT 1' server/database.mjs` → **2**（建表 `:532` + ALTER `:587`）。`grep -c -F 'ALTER TABLE inbox_items ADD COLUMN collapsed_count' server/database.mjs` → **1**。`grep -c -F 'collapsedCount: row.collapsed_count' server/database.mjs` → **1**（`:227`）。`grep -cE 'CHECK \((kind\|severity\|actor_type) IN' server/database.mjs` HEAD=**6**，`git show 516b369:server/database.mjs \| grep -cE` 同 **6**；六行原文逐字相同。inbox 两索引名与 base 相同。 |
| ② 折叠规则测试 | 做到 | `grep -cE '^test\(' test/inbox.test.mjs` → **20**。六串各 `grep -c -F` → 各 **1**。`node --test test/inbox.test.mjs > /tmp/d15r-inbox-test.log 2>&1; e=$?` → **0**，`ℹ tests 20` / `ℹ pass 20` / `ℹ fail 0`。前五条走真服务：`agentStatus` PATCH / `request` POST comments / `unreadInbox` GET `/api/inbox`。第六条 `DatabaseSync` 预建无列的 `inbox_items` 再 `startServer`，断言 `PRAGMA table_info` 含 `collapsed_count` 且 GET 200。既有 SSE 用例删除行恰 5、全在该块内（见逃避 1）。 |
| ③ 路由 / SSE | 做到 | `grep -c -F 'function emitInboxItem' server/app.mjs` → **1**。`grep -c -F 'emitInboxItem(' server/app.mjs` → **4**。`grep -c '.emit("inbox.item.created"'` 与 `grep -c -F` 均 **1**（helper `:797`）。`grep -oE '\.emit\("[a-z.]+"' server/app.mjs \| sort -u \| wc -l` → **17**；`comm -3` base vs HEAD 空。helper `:796-800` 显式 if/else，两路 `.emit("…")` 字面首参。 |
| ④ Web | 做到 | `grep -c -F 'collapsedCount: number' web/src/types.ts` → **1**。`grep -c -F 'data-testid="inbox-collapsed-count"' web/src/components/InboxView.tsx` → **1**。`grep -cE '^\s*(test\|it)\(' web/src/components/InboxView.test.tsx` → **5**；`grep -c -F 'collapsed'` → **6**；标题 `renders the collapsed count badge only when folded`：`collapsedCount: 3` → `×3`，`1` → `queryByTestId` null。`git diff $base..HEAD --stat -- web/src/App.tsx \| wc -l` → **0**。`npm run typecheck > /tmp/d15r-typecheck.log 2>&1; e=$?` → **0**。`npm run test:components` e=**0**，InboxView 5 tests。 |
| ⑤ 冒烟 + 旧库 | 做到 | 7 步改端口 **47998**、临时 `DATA_DIR`，`L()` 用授权 `.format`。任务 A id `aba3b1eb-…`：in_review → `unread 1 rows 1 92391cd0:status_changed:action_required:x1` → 评论同 id x2 `comment_created` `action_required`，summary `Agent 评论「第一条评论」` → move done 同 id x3 `status_changed` 仍 `action_required` → PATCH read `unread 0 rows 0`，`all rows 1` → 再评论新 id `9ab7c692` x1，`all rows 2` → 任务 B blocked `unread 2 rows 2`。`grep -c '^event: inbox.item.created'` → **3**；`grep -c '^event: inbox.updated'` → **3**。`TASKBOARD_URL=$U node cli/taskctl.mjs inbox list --json` e=0，`grep -c -F '"collapsedCount"'` → **1**。旧库专用副本 `/Users/happy/projects/taskboard/.scratch/d15-native/live-review`（未用已迁移的 `live/`、未碰主仓 `.data/`）：起服务前 `sqlite3 … PRAGMA table_info(inbox_items) \| grep -c collapsed_count` → **0**；`TASKBOARD_PORT=47998` 起服务 `/health` `{"status":"ok"}` HTTP 200；`GET /api/inbox` `rows 9 unread 9 all_x1 True`；杀掉后列数 **1**。47823 pid **47977** 仍 LISTEN；47998 用完已杀。 |
| ⑥ 回归 + 审查 | 做到 | `npm run check > /tmp/check-d15r.log 2>&1; e=$?` → **0**；`ℹ tests 147` / `ℹ pass 147` / `ℹ fail 0`；vitest `Tests  14 passed (14)`（≥14）。`git diff $base..HEAD -- test/ web/src/components/InboxView.test.tsx \| grep -cE '^-[[:space:]]*(test\|it)\('` → **0**。`git diff $base..HEAD -- test/inbox.test.mjs \| grep -E '^-' \| grep -vE '^---' \| wc -l` → **5**（全在豁免块）。`git diff $base..HEAD --stat -- cli/ shared/ docs/ package.json package-lock.json README.md README.zh-CN.md web/src/App.tsx \| wc -l` → **0**。本文件头行 **PASS**；S3 不触发。实现 report ⑥ 标 `NOT VERIFIED` 正确。 |

Out of scope：

- 不回填旧行、不做跨议题折叠、不做按 severity / actor 折叠、不加折叠开关：迁移只 ADD COLUMN DEFAULT 1；live-review 9 行全 `collapsedCount==1`；不同任务用例钉 2 行各 x1。没做错。
- 不改 `taskctl`、不改 `App.tsx`、不改既有 17 个事件名与既有 payload 键、不改三条路由的路径 / 错误码 / `unreadCount` 语义：`cli/` `web/src/App.tsx` `web/src/api.ts` 无 diff；事件名 `comm -3` 空；`listInbox` 仍 `COUNT(*)` 行数（冒烟折叠后 unread 1 不是 2）。没做错。
- 不动 `cli/**`、`shared/**`、`docs/**`、`README*`、`package.json`、`package-lock.json`、`.teams-orca*.json`、`AGENTS.md`、`CLAUDE.md`：two-dot 对这些 pathspec 空（本席 VERDICT 在 `docs/research/D15/`，不计入实现 diff）。没做错。
- 不重起 47823、不碰主仓 `.data/`：commit 不含 `.data/`；本席未碰 47823（pid 47977 仍在）；旧库只用 `.scratch/d15-native/live-review`。没做错。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `516b369..eabe4b2`）：

1. 断言删除：`--diff-filter=D -- test/` 空。`git diff $base..HEAD -- test/ web/src/components/InboxView.test.tsx` 删除行含 `assert|expect` 共 3 行，均在 `inbox SSE broadcasts created and updated events` 块内（`readAll.body.updated` 1→0；created 终值 2→1；updated 终值 2→3）。另 2 行删除是该块等待条件 `< 2`→`< 1` / `< 2`→`< 3`，不含 assert。`git diff $base..HEAD -- test/inbox.test.mjs \| grep -E '^-' \| grep -vE '^---' \| wc -l` → **5** ≤ 5，逐行均在该用例块。既有组件 fixture 只补 `collapsedCount: 1`（`InboxView.test.tsx` 共享 `item`）。新增 `\.skip\(|\.only\(|@ts-ignore|@ts-nocheck`：空。`# tests` = **147**（不 < 147）。未命中。
2. 守卫：diff 无新增 `|| true`、无新增空 `catch`。`assertTrustedNetworkRequest` 仍在 handler 入口 `app.mjs:1063`；`assertAllowedQuery` / `assertAllowedKeys` 调用未删。CHECK 六行与 base 逐字相同。未命中。
3. 门禁：commit message 与 diff 无 `--no-verify` / `--force`。未命中。
4. 判据：`docs/briefs/**` `docs/agents/**` `docs/research/**`（实现 diff）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `cli/**` `web/src/App.tsx` `web/src/api.ts` `README*` `package*.json` 无 diff。未命中。
5. 验证替代：`test/inbox.test.mjs` 无 mock/stub `database` 或 `EventHub`（走 `createTaskboardServer`）。迁移用例真预建旧表，不是起两次服务。冒烟用 `mktemp -d` 临时空库，不是 fixture。未命中。

清单 5 项全 0。

其它：

1. **折叠目标取最新**：47998 上新任务 agent `in_review` 得 1 行 id `f28d8ac2-…` `collapsedCount` 1；PATCH `unread` 后 `?state=all` 该任务仍 1 行；PATCH `read` 再 PATCH `unread` 后 agent 评论 → 折进**同一 id**，`kind=comment_created` `collapsedCount=2`，`?state=all` 仍 1 行。符合议题「`created_at` 最新的未读未归档行」。
2. **事务原子**：同一任务随后用过期 `version=1` agent PATCH `in_review` → **409** `VERSION_CONFLICT`（`expectedVersion: 1, actualVersion: 2`）；GET `/api/inbox` `unreadCount` 仍 **3**，该任务行 `collapsedCount` 仍 **2**、id 不变。折叠 UPDATE 没在失败事务外落盘。
3. **user 事件不触发折叠**：新任务 agent `in_review` 后 `unreadCount` 4、该行 `collapsedCount` 1 `severity=action_required` `kind=status_changed`；无 agent 头 PATCH `blocked` → HTTP **200** 任务变 `blocked`；inbox `unreadCount` 仍 **4**、同 id、`collapsedCount` 1、`severity` 仍 `action_required`、`kind` 仍 `status_changed`。
4. **归档行不参与**：PATCH `archived` 后 agent 评论 → 未读新行 `collapsedCount` **1**、`new_id True`；`?state=all` 该任务 **2** 行（新未归档 x1 + 已归档 x1）。
5. **SSE payload**：折叠 `inbox.updated` data 顶层键 `at` / `item` / `projectId` / `task` / `taskId` / `type`，`item.collapsedCount` 为 2 或 3（≥2）。PATCH read 的 `inbox.updated` 无 `task` 键（`at` / `item` / `projectId` / `taskId` / `type`），与既有 EventHub 包装 + `events.emit("inbox.updated", { item })` 形状一致。7 步截止时 created/updated = **3/3**。
6. **diff 体积与分层**：`git diff --stat $base..HEAD` 原文：
   ```
    server/app.mjs                        |  21 ++--
    server/database.mjs                   |  46 ++++++++-
    test/inbox.test.mjs                   | 188 +++++++++++++++++++++++++++++++++-
    web/src/components/InboxView.test.tsx |  11 ++
    web/src/components/InboxView.tsx      |  20 +++-
    web/src/styles.css                    |  19 ++++
    web/src/types.ts                      |   1 +
    7 files changed, 286 insertions(+), 20 deletions(-)
   ```
   `git diff --numstat $base..HEAD -- server/database.mjs` → `43 3`，净增 **40** ≤ 60。`server/app.mjs` → `12 9`，净增 **3** ≤ 10。`InboxView.tsx` `grep -c fetch` → **0**。

另核：审查开始时 `git rev-list --count 516b369..HEAD` = **1**；`git diff-tree -r --numstat --no-commit-id HEAD` 原文：
```
12	9	server/app.mjs
43	3	server/database.mjs
183	5	test/inbox.test.mjs
11	0	web/src/components/InboxView.test.tsx
17	3	web/src/components/InboxView.tsx
19	0	web/src/styles.css
1	0	web/src/types.ts
```
`wc -l` = **7**，每行路径均在议题允许的 7 个文件内。`git ls-remote --heads origin spec/15` 空、`git branch -r --list 'origin/spec/15'` 空（未 push）。`git log --format=%b 516b369..eabe4b2 | grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --check` 空。`git merge-base --is-ancestor a0a605b HEAD` e=0。

## 局限

- 归档排除 `archived_at IS NULL` 无单测（§6 排除分支）；本席 extra4 亲跑行为正确，不构成产品缺陷。建议级。
- `fold: same task…` 用 `setTimeout(5)` 推 `createdAt` 先后（`inbox.test.mjs:361`）；断言本身比的是内容时间戳。建议级。
- 迁移用例只断言列存在 + GET 200，不锁旧行 DEFAULT 1；旧库冒烟 9 行 `all_x1 True` 补了这一面。建议级。
- `InboxView` 为徽标加了 `.inbox-item-badges` 包裹与 flex 样式（议题只点名徽标 span）。样式建议级。
- impl report ③ `grep -c '.emit("inbox.item.created"'` 未 `-F`（Standards §3）；与本席 `grep -F` 计数相同。
- `grep -oE '\.emit\("[a-z.]+"'` 匹配不到带连字符的 `client-storage.updated`（既有，base/HEAD 均为 17，`comm -3` 空）。
- 未开浏览器；徽标以组件测试 + typecheck + 47998 API 冒烟为准。
- 冒烟 `L()` 因原任务书 Python f-string 在本机 SyntaxError，经 impl 已记录的协调席授权改用等价 `.format(...)`；字段与预期未改。
- 未造并发双写撞同一未读行的竞态（过期 version 409 已覆盖失败路径不写折叠）。
