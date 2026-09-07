PASS
reviewedHead: b2633b6b0859d77a96ed3dfec8bf8e2bd2348e65
fixedPoint: 2d6cfdc9d7bbe731bed0dce009b45e2aa31fa397
diffCommand: git diff 2d6cfdc9d7bbe731bed0dce009b45e2aa31fa397..b2633b6b0859d77a96ed3dfec8bf8e2bd2348e65
commits: b2633b6 feat(activities): cap task activity timeline to the latest N with limit and hasMore (#21)
implReport: /Users/happy/projects/taskboard/.scratch/d21-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/21 （验收 6 + Out of scope 4；comments 空）
conclusion: 逐条核过（①–⑤ 命令与取值均为本席亲跑，端口 47998；⑥ 为本席 VERDICT；补充打点 1–6 亲跑；逃避清单对 `2d6cfdc9..b2633b6` 机械核；未改交付物、未 push；活库只用 `.scratch/d21-native/live-review`，未碰 `live/` 与主仓 `.data/`）

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 4 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

Standards 轴 1 条硬违反（impl report ① 若干字面 `grep` 未 `-F`，§3；本席 `grep -c -F` 计数相同）+ 0 条产品级。Spec 轴 0 条 finding。不选总赢家。

## Standards 轴

汇总：`listTaskActivities` 用 `LIMIT ?` 绑定、内外层都带 `id` tie-break、`COUNT(*)` 与主查询同一 `task_id = ?`；路由复用 `assertAllowedQuery` + `parseTaskTreeQuery` 的 `/^\d+$/` / `Number.isSafeInteger` / 范围写法；`pr-review-regressions` 只改一个标记字符串；TaskDetail 加 state + 一行提示，取消 / 错误路径零 diff。report 退出码无管道。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d21r.log 2>&1; e=$?` → **0**；`npm run typecheck > /tmp/d21r-typecheck.log 2>&1; e=$?` → **0**；`npm run check > /tmp/d21r-check.log 2>&1; e=$?` → **0**，`ℹ tests 158` / `ℹ pass 158` / `ℹ fail 0`，vitest `Tests  20 passed (20)`，与 report 一致。新哨兵/变异：不适用。 |
| §3 本机工具陷阱 | 违反（report ① 若干字面无 `-F`）；本席重跑符合 | report ① `LIMIT ?` / `ORDER BY created_at DESC, id DESC` / `taskActivityFromRow` 未一律 `-F`（议题原文即此针；`ORDER BY created_at, id$` 与 `COUNT(\*)` 必须是正则）。ugrep 下这些针无中间 `$`，计数仍可信。本席 `grep -c` 与 `grep -c -F` 对 `LIMIT ?` 均 **1**、对 `SELECT * FROM task_activities` 均 **1**。无 awk `==` 对非 ASCII、无 `ps \| grep`、无 `pgrep -f` 等待环。冒烟 `python3 -c` 无嵌套引号 f-string。 |
| §6 测试与断言 | 符合 | 六条经 `startServer` → `createTaskboardServer` 真 HTTP（`test/task-activities.test.mjs:20-26` / 用例 `:82-156`）。期望为字面量：`["活动 1", "活动 2", "活动 3"]`、`["活动 3", "活动 4"]`、`INVALID_FIELD` / `UNKNOWN_QUERY_PARAMETER` / `INVALID_QUERY_PARAMETER`、`activities.length` 100、`hasMore` true、`after` `"活动 2"` / `"活动 101"`。`default limit is 100` 真造 101 条（`:147-148` `Array.from({ length: 101 })` + `createTitleActivities`）。无 `.skip(` / `.only(`。未 mock / stub `database`。 |
| limit `?` 占位 | 符合 | `server/database.mjs:1926` `LIMIT ?`，`:1929` `.all(task.id, limit)`。SQL 模板无 `${limit}` / 字符串拼接用户输入。 |
| 双重排序都带 id | 符合 | 内层 `:1925` `ORDER BY created_at DESC, id DESC`；外层 `:1928` `ORDER BY created_at, id`。 |
| hasMore COUNT 同条件 | 符合 | 主查询 `:1924` 与 COUNT `:1931` 均为 `WHERE task_id = ?`，bind `task.id`。`hasMore: total > limit`（`:1933`）。 |
| 路由校验复用 | 符合 | `assertAllowedQuery(url.searchParams, new Set(["limit"]), "GET /api/tasks/:id/activities")`（`app.mjs:1453`）。整数：`/^\d+$/.test(rawLimit)` + `Number.isSafeInteger(limit)` + `limit < 1 \|\| limit > 500`（`:1456-1457`），与 `parseTaskTreeQuery` `:787-789` 同形（depth 1–25 / limit 1–500）。未另造解析器。 |
| pr-review-regressions 只改标记 | 符合 | `git diff 2d6cfdc9..HEAD -- test/pr-review-regressions.test.mjs \| grep -E '^-' \| grep -vE '^---'` 恰 1 行：`-    "  listTaskActivities(taskId)",`。正则断言未改（`:42-43` `SELECT * FROM task_activities` / `taskActivityFromRow`）。`node --test test/pr-review-regressions.test.mjs` e=**0**，tests 2 / pass 2。 |
| TaskDetail 范围 | 符合 | 加 `activitiesTruncated` state（`:376`）；成功回调解包 `nextActivities.activities` / `hasMore`（`:474-475`，任务书明文）；提示行 `:1204`。`AbortError` return 与 `setCommentsError` 错误路径（`:478-485`）及 `return () => controller.abort()` 零 diff。 |
| Fowler 味道 | 判断调用，非硬违反 | **Duplicated Code**（判断）：`startServer` / `request` / `createTask` 与 `test/inbox.test.mjs` 同形，任务书点名照抄。非 Shotgun Surgery（允许的 7 文件）。非 Speculative Generality（无游标分页、无加载更多、无新抽象）。`listTaskActivities` / 路由块未过长。 |

Worst within Standards: report 字面 `grep` 未一律 `-F`（§3）。计数仍可信。无产品缺陷。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `2d6cfdc9..b2633b6`（审查开始时实现 commit 恰 1）。任务书 baseSha `61f4e40` 是写单时 main；实际 merge-base 是 briefs commit `2d6cfdc9`（含 D21 两单），two-dot 仍只有实现七文件。`git merge-base --is-ancestor 61f4e40456f39907d3550aab6b8bdfa666d346a0 HEAD` e=0。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 数据层 | 做到 | `awk '/^  listTaskActivities\(/,/^  }/' server/database.mjs` 切出方法体后：`grep -c 'LIMIT ?'` = **1**（`-F` 同 1）；`grep -c 'ORDER BY created_at DESC, id DESC'` = **1**；`grep -c 'ORDER BY created_at, id$'` = **1**；`grep -c -F 'SELECT * FROM task_activities'` = **1**；`grep -c 'taskActivityFromRow'` = **1**；`grep -c 'COUNT(\*)'` = **1**（`-F 'COUNT(*)'` 同 1）。`git diff 2d6cfdc9..HEAD -- server/database.mjs \| grep -c 'activitiesForTasks'` = **0**（`-F` 同 0）。`#requireTask` 仍是方法体第一句（`:1920`）。 |
| ② 路由 | 做到 | `grep -c -F 'new Set(["limit"])' server/app.mjs` = **1**。`grep -c -F 'Activity routes do not accept query parameters' server/app.mjs` = **0**。`grep -c -F "'limit' must be an integer from 1 to 500" server/app.mjs` = **1**。`grep -c -F 'hasMore' server/app.mjs` = **2**。`grep -c 'taskActivitiesRoute' server/app.mjs` HEAD=**3**，`git show 2d6cfdc9:server/app.mjs \| grep -c` = **3**。405 仍 `methodNotAllowed(response, ["GET"])`（`:1463`）。 |
| ③ 测试钉死 | 做到 | `ls test/task-activities.test.mjs` e=0。`grep -cE '^test\('` = **6**。六串各 `grep -c -F` = 各 **1**。`default limit is 100` 用例体：`Array.from({ length: 101 }, (_, index) => \`活动 ${index + 1}\`)` 后 `createTitleActivities`；断言 `activities.length` 100、`hasMore` true、`activities[0].changes[0].after` = `"活动 2"`、末条 `"活动 101"`。全部 `createTaskboardServer`。`git diff … -- test/pr-review-regressions.test.mjs \| grep -E '^-' \| grep -vE '^---' \| wc -l` = **1** 且该行含 `listTaskActivities(taskId)`。`git diff … -- test/ \| grep -cE '^-\s*(test\|it)\('` = **0**。`node --test test/task-activities.test.mjs` e=**0**，tests 6 / pass 6 / fail 0。 |
| ④ Web | 做到 | `awk '/export async function listTaskActivities/,/^}/' web/src/api.ts \| grep -c 'hasMore'` = **2**（`-F` 同 2）。`grep -c -F 'hasMore' web/src/components/TaskDetail.tsx` = **1**。`grep -c -F 'text("仅显示最近 100 条活动", "Showing the latest 100 activities")'` = **1**。`grep -c -F 'className="activity-truncated"'` = **1**（创建条目之后、变更 map 之前，`:1204`）。`npm run typecheck > /tmp/d21r-typecheck.log 2>&1; e=$?` → **0**。`git diff 2d6cfdc9..HEAD --stat -- web/src/App.tsx web/src/types.ts \| wc -l` = **0**。 |
| ⑤ 冒烟 + 活库 | 做到 | 3 步改端口 **47998**、临时 `DATA_DIR`（`/var/folders/…/tmp.oeU2RuNqEq`）。`/health` 200 `{"status":"ok"}`。patched to v6。`default: n 5 hasMore False afters ['活动 1', '活动 2', '活动 3', '活动 4', '活动 5']`；`limit=2: n 2 hasMore True afters ['活动 4', '活动 5']`；`limit=500: n 5 hasMore False afters ['活动 1', '活动 2', '活动 3', '活动 4', '活动 5']`。`?limit=0` / `?limit=abc` / `?limit=501` → 各 **400 INVALID_FIELD**；`?foo=1` → **400 UNKNOWN_QUERY_PARAMETER**；`?limit=2&limit=3` → **400 INVALID_QUERY_PARAMETER**。活库专用副本 `/Users/happy/projects/taskboard/.scratch/d21-native/live-review`（未用实现席 `live/`、未碰主仓 `.data/`）：`02d55bcc-a661-43fb-90da-678600f2c534 8`；`default: n 8 hasMore False afters ['in_review', 'in_progress', 'in_review', 'in_progress', 'in_review', 'todo', 'in_progress', 'done']`；`limit=3: n 3 hasMore True afters ['todo', 'in_progress', 'done']`（与 sqlite 升序最后三条 `todo` / `in_progress` / `done` 一致）。47823 pid **26644** 仍 LISTEN；47998 用完已杀。 |
| ⑥ 回归 + 审查 | 做到 | `npm run check > /tmp/d21r-check.log 2>&1; e=$?` → **0**；`ℹ tests 158` / `ℹ pass 158` / `ℹ fail 0`；vitest `Tests  20 passed (20)`。`git diff 2d6cfdc9..HEAD --stat -- cli/ shared/ docs/ README.md README.zh-CN.md package.json package-lock.json web/src/App.tsx web/src/types.ts \| wc -l` = **0**。本文件头行 **PASS**；S3 不触发。实现 report ⑥ 标 `NOT VERIFIED: grok VERDICT PASS` 正确。 |

Out of scope：

- 不做「加载更多」/ 游标分页；不给 `#activitiesForTasks` 加上限；不改活动写入：`grep -n -F '加载更多'` 允许文件空；`#activitiesForTasks` two-dot 0；`#recordTaskActivity` 不在 diff 内。没做错。
- 不改 `types.ts`（`TaskChangeActivity` 形状不变）、`App.tsx`、CLI、事件与 payload：`web/src/App.tsx` / `web/src/types.ts` / `cli/` two-dot 空；`events.emit("` 去重 HEAD=18 / base=18，`comm` 两侧空。没做错。
- 不动 `cli/**`、`shared/**`、`docs/**`（实现 diff）、`README*`、`package.json`、`package-lock.json`、`.teams-orca*.json`、`AGENTS.md`、`CLAUDE.md`：two-dot 对这些 pathspec 空（本席 VERDICT 在 `docs/research/D21/`，不计入实现 diff）。没做错。
- 不重起 47823、不碰主仓 `.data/`：本席未碰 47823（pid **26644** 仍 LISTEN）；活库只用 `.scratch/d21-native/live-review`；实现席 `live/` mtime 审查前后均为 `1788749655`；主仓 `.data/taskboard.sqlite` mtime 均为 `1788700980`。没做错。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `2d6cfdc9..b2633b6`）：

1. 断言删除：`--diff-filter=D -- test/` 空。`git diff … -- test/` 删除行含 `assert|expect`：**none**（豁免行 `-    "  listTaskActivities(taskId)",` 不含 assert/expect；`wc -l` = **1** 且含 `listTaskActivities(taskId)`，议题原句「只改那一个标记字符串」）。`grep -cE '^-\s*(test|it)\('` → **0**。新增 `\.skip\(|\.only\(`：空。`# tests` = **158**（不 < 158）。未命中。
2. 守卫：diff 无新增 `|| true`、无新增空 `catch`。`assertTrustedNetworkRequest` 仍在 handler 入口 `app.mjs:1063`；`assertAllowedQuery` 被活动路由**新增调用**（`:1453`），不是删调用。`#requireTask` 仍在 `listTaskActivities` 开头（`:1920`）——守卫仍在，非「被关」。未命中。
3. 门禁：commit message 与 diff 无 `--no-verify` / `--force`。`git log … \| grep -cE '\-\-no-verify|\-\-force'` → **0**。未命中。
4. 判据：`docs/briefs/**` `docs/agents/**` `docs/research/**`（实现 diff）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `cli/**` `web/src/App.tsx` `web/src/types.ts` `README*` `package*.json` 无 diff。未命中。
5. 验证替代：`test/task-activities.test.mjs` 无 mock/stub `database`（`grep -nE 'mock|stub'` 空）；走 `createTaskboardServer`。冒烟 `mktemp -d` 临时空库，不是 fixture。`default limit is 100` 真造 101 条。未命中。

清单 5 项全 0。

其它：

1. **同毫秒 tie-break**：47998 临时库对同一议题连打 3 次 PATCH（脚本内不 sleep）。`?limit=2` 两条 id 与默认最后两条一致：`limit2_ids_eq_default_last2 True`。PATCH 时间戳相隔 ~28ms（`2026-09-07T03:12:40.174Z` / `.202Z` / `.229Z`），未撞上同毫秒。另用同一 `created_at=2026-09-07T00:00:00.000Z` 插入 `aaa-id` / `ccc-id` / `bbb-id` 三行：默认 ids `['aaa-id','bbb-id','ccc-id']`（外层 ASC）；`?limit=2` ids `['bbb-id','ccc-id']`（内层 DESC 取最新两条再 ASC），`limit2_eq_default_last2 True`，`createdAts` 三条相同。内外层都带 `id` 才稳定。
2. **hasMore 边界**：活动恰 5 条时 `?limit=5` → `n 5 hasMore False`；`?limit=4` → `n 4 hasMore True afters ['活动 2', '活动 3', '活动 4', '活动 5']`。
3. **404 仍在**：`GET /api/tasks/nope/activities` → **404** `TASK_NOT_FOUND` / `Task 'nope' does not exist`（`#requireTask` 未被绕过）。
4. **Origin 仍生效**：`GET /api/tasks/<id>/activities` 带 `Origin: https://evil.example` → **403** `INVALID_ORIGIN` / `Request Origin must be local or private`。`assertTrustedNetworkRequest` 调用点 two-dot 零改（`:1063`）。
5. **列表页查询零 diff**：`git diff 2d6cfdc9..HEAD -- server/database.mjs \| grep -c 'activitiesForTasks'` = **0**。`node --test test/pr-review-regressions.test.mjs` e=**0**（listQuery 断言仍绿）。
6. **diff 体积**：`git diff --stat 2d6cfdc9..HEAD` 原文：
   ```
    server/app.mjs                      |  10 ++-
    server/database.mjs                 |  18 +++--
    test/pr-review-regressions.test.mjs |   2 +-
    test/task-activities.test.mjs       | 156 ++++++++++++++++++++++++++++++++++++
    web/src/api.ts                      |   9 ++-
    web/src/components/TaskDetail.tsx   |   6 +-
    web/src/styles.css                  |   8 ++
    7 files changed, 195 insertions(+), 14 deletions(-)
   ```
   `git diff --numstat`：`server/database.mjs` 13/5 净增 **8** ≤ 20；`server/app.mjs` 7/3 净增 **4** ≤ 12；`TaskDetail.tsx` 5/1 净增 **4** ≤ 8。未超。

另核：审查开始时 `git rev-list --count 2d6cfdc9..HEAD` = **1**；`git diff-tree -r --numstat --no-commit-id HEAD` 原文：
```
7	3	server/app.mjs
13	5	server/database.mjs
1	1	test/pr-review-regressions.test.mjs
156	0	test/task-activities.test.mjs
5	4	web/src/api.ts
5	1	web/src/components/TaskDetail.tsx
8	0	web/src/styles.css
```
`wc -l` = **7**，每行路径均在议题允许的 7 个文件内。`git ls-remote --heads origin spec/21` 空、`git branch -r --list 'origin/spec/21'` 空（未 push）。`git log --format=%b 2d6cfdc9..b2633b6 | grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --summary` 0 行。

## 局限

- impl report ① 若干字面 `grep` 未一律 `-F`（Standards §3）；议题原文部分即无 `-F`，`id$` / `COUNT(\*)` 必须是正则；本席 `grep -F` 计数相同。建议级。
- `web/src/api.ts` 暴露可选 `limit?: number`（任务书扩展点明文；议题 Web 段只要求返回 `{ activities, hasMore }`）。TaskDetail 不传，默认 100。建议级，非 scope creep 必修。
- 切换议题时 effect 开头不清 `activitiesTruncated`（与既有不清 `taskActivities` 同形）；可能闪一下旧提示。建议级。
- 事件名去重 `events.emit("` HEAD=**18** / base=**18**，`comm` 空。部分旧单写「17」；多出的是既有 `client-storage.updated`，非本 diff 引入。不计 finding。
- 未开真浏览器点详情页 hasMore 提示。④ 为 grep + typecheck；本席未造 101 条活动的 Web 会话。抽查未见，不构成产品缺陷。
- PATCH 同毫秒未自然撞上（HTTP 往返 ~28ms）；同毫秒稳定性用 sqlite 同 timestamp 插入补测。
