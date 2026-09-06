PASS
reviewedHead: 3eb375719533c0f7b21af8b9450b4d8ddda3d4a2
fixedPoint: 5dd0065a69c6c8850dcacb0a49c7479cb2b3bf87
diffCommand: git diff 5dd0065a69c6c8850dcacb0a49c7479cb2b3bf87..3eb375719533c0f7b21af8b9450b4d8ddda3d4a2
commits: 3eb3757 fix(inbox): agent status changes via /api/tasks/:id/move create inbox items (#11)
implReport: /Users/happy/projects/taskboard/.scratch/d11-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/11 （验收 6 + Out of scope 3；comments 空）
conclusion: 逐条核过（①–⑤ 命令与取值均为本席亲跑；⑥ 为本席 VERDICT；补充打点 1–6 亲跑；逃避清单对 `5dd0065..3eb3757` 机械核；未改交付物、未 push）

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 3 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

Standards 轴 1 条判断级（report 部分字面 grep 未 `-F`）；Spec 轴 0 条 finding。不选总赢家。

## Standards 轴

汇总：`#statusChangeInboxItem` 真共用、inbox 写在 `moveTask` 的 `BEGIN IMMEDIATE … COMMIT` 内、`updateTask` 抽 helper 后语义等价；report 退出码无管道。§3 违反（report 部分字面 `grep` 未加 `-F`）；本席用 `grep -F` 重跑计数相同。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d11r.log 2>&1; e=$?` → **0**；`npm run check > /tmp/check-d11r.log 2>&1; e=$?` → **0**，`ℹ tests 135` / `ℹ pass 135` / `ℹ fail 0`，vitest `Tests  13 passed (13)`，与 report 一致。新哨兵/变异：不适用。 |
| §3 本机工具陷阱 | 违反（report 字面 grep 部分无 `-F`）；本席重跑符合 | report ② `grep -c '.emit("inbox.item.created"'` / `grep -c '.emit("task.moved"'` 未 `-F`（ugrep 下 `.` 是正则；针无 `$`，本席 `grep -c -F` 仍各 **3** / **1**）。① 的 `'#statusChangeInboxItem('` / `'kind: "status_changed"'` report 也未 `-F`，本席 `grep -c -F` 仍各 **3** / **1**。③ 六串 report 用了 `grep -c -F`。无 awk `==`、无 `ps \| grep`、无 `pgrep -f` 等待环。 |
| §6 测试与断言 | 符合 | `test/inbox.test.mjs` 经 `createTaskboardServer` 真 HTTP（`startServer` `:20-26`）；summary / severity 期望为字面量（`:284` `Agent 把「移动待确认事项」改为 等你确认` 等）；负例 `userMove` / same-status 均 POST `/move` 后再 GET `/api/inbox`（`:308-324`）。无新增 `.skip(` / `.only(` / `@ts-ignore`。未 mock `database` / `EventHub`。 |
| helper 共用 | 符合 | 1 定义 `server/database.mjs:2408`；`updateTask` `:1571` 与 `moveTask` `:1634` 各 1 调用。`grep -c -F '#statusChangeInboxItem(' server/database.mjs` → **3**。`INBOX_STATUS_SEVERITIES[` 与 `kind: "status_changed"` 仅 helper `:2410` / `:2416`，各 **1**。不是两份近似代码。 |
| 事务原子 | 符合 | `moveTask` `:1618` `BEGIN IMMEDIATE` → `:1634` `#statusChangeInboxItem`（内部 `#createInboxItem` INSERT `:2427-2446`）→ `:1642` `COMMIT`；失败 `:1644` `ROLLBACK`。inbox 不在事务外写入。 |
| `updateTask` 语义 | 符合 | 对照 two-dot diff 被删块与 helper 体：`actor.type === "agent"`、`status !== current.status`、`INBOX_STATUS_SEVERITIES[status]`、`String(title).replace(/\s+/g," ").trim()`、summary 模板 `Agent 把「${taskTitle}」改为 ${TASK_STATUS_LABELS_ZH[status]}`、`sourceId: null`、`projectId: destinationProjectId` 均保留。掉 `Object.hasOwn(changes, "status")`：缺 key 时传入 `changes.status === undefined`，`INBOX_STATUS_SEVERITIES[undefined]` 仍 falsy → `null`（`:2409-2411`），与旧短路等价。返回仍 `getTask` + 非枚举 `defineProperty(task, "inboxItem")`（`:1584-1586`）。CLI JSON 无 `inboxItem` 键（冒烟 `move1.json` 核过）。 |
| Fowler 味道 | 判断调用，非硬违反 | 非 Duplicated Code：规则只在 helper。`defineProperty` 双尾（`:1585` / `:1648`）与 PATCH/move 两处 `emit`（`app.mjs:1737-1739` / `:1768-1770`）是议题要求的同形尾部，非猜测性抽象。Shotgun Surgery 不适用（pathspec 三文件）。`moveTask` 因 inbox 略加长，helper 抵消了 `updateTask` 内联块。 |

Worst within Standards: report 字面 `grep` 未一律 `-F`（§3）。计数仍可信。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `5dd0065..3eb3757`（审查开始时实现 commit 恰 1）。任务书 baseSha `bfeec53` 是写单时 main；实际 merge-base 是 briefs commit `5dd0065`，two-dot 仍只有实现三文件。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 共用一处 | 做到 | `grep -c '#statusChangeInboxItem(' server/database.mjs` → **3**（`grep -c -F` 同 **3**）。`grep -c 'INBOX_STATUS_SEVERITIES\['` / `grep -c -F 'INBOX_STATUS_SEVERITIES['` → **1**。`grep -c 'kind: "status_changed"'` / `grep -c -F` → **1**。`awk '/^  moveTask(/,/^  archiveTask(/' server/database.mjs \| grep -c '#statusChangeInboxItem('` → **1**。`awk` 对 `updateTask`…`moveTask` 亦 **1**。 |
| ② 路由 | 做到 | `grep -c '.emit("inbox.item.created"' server/app.mjs` → **3**（`grep -c -F` 同 **3**：comment `:1478` / PATCH `:1738` / move `:1770`）。`grep -c '.emit("task.moved"'` → **1**（`:1768`，且先于 inbox emit）。`grep -oE '\.emit\("[a-z.]+"' server/app.mjs \| sort -u \| wc -l` → **17**。`comm -3` base vs HEAD 事件名差集空（不加不减）。move 的 `{ item: task.inboxItem, task }` 与 PATCH `:1737-1739` 逐字同形。 |
| ③ 测试钉死 | 做到 | `grep -cE '^test\(' test/inbox.test.mjs` → **14**。六字面串各 `grep -c -F` → 各 **1**（`agent move in_review -> action_required` / `agent move blocked -> attention` / `agent move done -> info` / `agent move same status -> none` / `user move in_review -> none` / `inbox SSE broadcasts on move`）。既有 8 条标题仍各 **1**。`node --test test/inbox.test.mjs > /tmp/d11r-inbox-test.log 2>&1; e=$?` → **0**，`ℹ tests 14` / `ℹ pass 14` / `ℹ fail 0`。负例经真服务：`userMove` `:77-84` POST `/api/tasks/:id/move` 无 agent 头，再 `unreadInbox` GET `/api/inbox` 断言 `unreadCount` 0（`:318-324`）；same-status 先 PATCH 得 1 再 `agentMove` + `sortOrder` 仍 1（`:308-316`）。无 mock。 |
| ④ 冒烟 | 做到 | 6 步改端口 **47998**、`TASKBOARD_URL=http://127.0.0.1:47998`，临时 `DATA_DIR` 亲跑。第 3 步原命令：`TASKBOARD_URL=$U node cli/taskctl.mjs issue move "$TID" --status in_review --thread-id smoke --json` → `cli e=0`。GET `/api/inbox` → `unreadCount` **1**，`items[0].kind=status_changed`，`severity=action_required`，`summary=Agent 把「move 冒烟」改为 等你确认`。第 4 步 agent 同状态 `sortOrder:5000` → `unreadCount 1`。第 5 步 user POST `/move` `blocked` → `unreadCount 1`。第 6 步 agent POST `/move` `done` → `done` / `2 status_changed info`。`grep -c '^event: inbox.item.created'` → **2**；`grep -c '^event: task.moved'` → **4**。47823 pid **92872** 仍 LISTEN；47998 用完已杀。 |
| ⑤ 回归 | 做到 | `npm run check > /tmp/check-d11r.log 2>&1; e=$?` → **0**；`ℹ tests 135` / `ℹ pass 135` / `ℹ fail 0`；vitest `Tests  13 passed (13)`（≥13）。`git diff 5dd0065..HEAD -- test/ \| grep -cE '^-\\s*(test\|it)\\('` → **0**（test/ 无任何删除内容行）。`git diff 5dd0065..HEAD --stat -- package.json package-lock.json web/ cli/ shared/ docs/ \| wc -l` → **0**。`git diff --name-only` 仅 `server/app.mjs` `server/database.mjs` `test/inbox.test.mjs`。活库 `TASKBOARD_DATA_DIR=/Users/happy/projects/taskboard/.scratch/d11-native/live` 端口 47998：`/health` = `{"status":"ok"}`；`GET /api/inbox` HTTP **200** `{"items":[],"unreadCount":0}`。未碰主仓 `.data/`。 |
| ⑥ 审查 | 做到 | 本文件头行 **PASS**；S3 不触发。实现 report ⑥ 标 `NOT VERIFIED` 正确。 |

Out of scope：

- 不改 `updateTask` 既有行为与返回形状；不改 `#recordTaskActivity`；不做 archive/restore 通知、新 kind、去重：`#recordTaskActivity` 函数体不在 diff 内（moveTask 仍在 inbox 之前调用 `:1628`）；`updateTask` 返回仍非枚举 `inboxItem`；无新 kind / 新事件名。没做错。
- 不动 `web/` `cli/` `shared/` `docs/` `package.json` `package-lock.json` `.teams-orca*.json` `AGENTS.md` `CLAUDE.md` `README*`：`git diff --name-only 5dd0065..3eb3757` 对这些 pathspec 空。没做错。
- 不重起 47823、不碰主仓 `.data/`：commit 不含 `.data/`；本席未碰 47823（pid 92872 仍在）；活库只用 `.scratch/d11-native/live`。没做错。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `5dd0065..3eb3757`）：

1. 断言删除：`--diff-filter=D -- test/` 空。删除行含 `assert|expect`：空（`wc -l` **0**）。新增 `\.skip\(|\.only\(`：空。`# tests` = **135**（不 < 135）。未命中。
2. 守卫：diff 无新增 `|| true`、无新增空 `catch`。`assertTrustedNetworkRequest` 仍在 handler 入口 `app.mjs:1054`；`assertAllowedKeys` 仍用于 `parseMove` `:580`；`moveTask` 仍 `#requireVersion` `:1591`（调用未删、未绕）。未命中。
3. 门禁：commit message 与 diff 无 `--no-verify` / `--force`。未命中。
4. 判据：`docs/briefs/**` `docs/agents/**` `docs/research/**` `AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `cli/**` `web/**` `package.json` `package-lock.json` 无 diff。未命中。
5. 验证替代：`test/inbox.test.mjs` 无 mock/stub `database` 或 `EventHub`（走 `createTaskboardServer`）。冒烟第 3 步亲跑 `node cli/taskctl.mjs issue move`（`cli e=0`）。未命中。

清单 5 项全 0。

其它：

1. **负例经过真判定链**：是。`test/inbox.test.mjs:318-324`：无 agent 头 `userMove` POST `/move` `in_review`（200）后再 GET `/api/inbox`，断言 `unreadCount` 0。`:308-316`：agent PATCH 到 `in_review` 得 1 条，再 agent POST `/move` 同状态 + `sortOrder: 5000`，GET `/api/inbox` 仍 1。冒烟第 4 / 5 步同构（unreadCount 保持 1）。
2. **事务原子**：是。47998 上 agent 先 POST `/move` `in_review`（unreadCount **1**），再用过期 `version=1` agent POST `/move` `blocked` → **409** `VERSION_CONFLICT`（`expectedVersion: 1, actualVersion: 2`）；随后 GET `/api/inbox` `unreadCount` 仍 **1**（inbox 没在失败事务外写入）。`#requireVersion` 在 `BEGIN` 之前；事务内 UPDATE 不中则 ROLLBACK。
3. **SSE payload 形状**：是。冒烟 `events.log` 6 块：`task.moved` 均先于同一次的 `inbox.item.created`。两条 `inbox.item.created` data 顶层含 `projectId='local'` / `taskId=<uuid>` / `item` / `task`；`item.kind='status_changed'`；severity 分别为 `action_required` 与 `info`。同状态与 user move 只发 `task.moved`、不发 inbox。
4. **活动记录不退化**：是。临时库 `sqlite3 $D/taskboard.sqlite "select count(*) from task_activities"`：agent move `in_review` 前 **0** 后 **1**，差 **1**；`changes=[{"field":"status","before":"backlog","after":"in_review"}]`，`actor_type=agent`。冒烟终态 3 条活动对应三次真实状态变更（cli in_review / user blocked / agent done）；同列重排不写活动（既有 `#recordTaskActivity` 对空 changes 直接 return，`:2391`）。
5. **归档任务 move**：是。`POST /archive` 200 后 agent `POST /move` `done` → **409** `TASK_ARCHIVED` `Archived tasks cannot be moved`；`unreadCount` 归档后 **1**、失败 move 后仍 **1**。
6. **diff 体积**：`git diff --stat $base..HEAD` 原文：
   ```
    server/app.mjs      |   3 ++
    server/database.mjs |  56 +++++++++++++++++++----------
    test/inbox.test.mjs | 100 ++++++++++++++++++++++++++++++++++++++++++++++++++++
    3 files changed, 140 insertions(+), 19 deletions(-)
   ```
   `git diff --numstat $base..HEAD -- server/database.mjs` → `37 19`，净增 **18** ≤ 40。

另核：审查开始时 `git rev-list --count 5dd0065..HEAD` = **1**；`git diff-tree -r --numstat --no-commit-id HEAD` 原文：
```
3	0	server/app.mjs
37	19	server/database.mjs
100	0	test/inbox.test.mjs
```
`wc -l` = **3**。`git ls-remote --heads origin spec/11` 空、`git branch -r --list 'origin/spec/11'` 空（未 push）。`git log --format=%b 5dd0065..3eb3757 | grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --check` 空。`git merge-base --is-ancestor bfeec53 HEAD` e=0。

## 局限

- 未开浏览器；本议题 Out of scope 不动 Web，以服务端测试 + 冒烟 + SSE 抓包为准。
- SSE 单测（`test/inbox.test.mjs:326-352`）锁 `item` / `taskId` / `projectId`，不锁 `item.kind` 与 `task.moved` 先至；payload 与次序由本席抓包核过，不构成产品缺陷。
- 无「agent move `in_progress`/`todo`/`canceled` → none」新用例；helper 共用 `INBOX_STATUS_SEVERITIES`，PATCH 既有 `agent in_progress -> none` 仍绿。建议级。
- `updateTask` 抽 helper 时去掉 `Object.hasOwn(changes, "status")`，缺 key 时靠 `INBOX_STATUS_SEVERITIES[undefined]` 得 null，与旧短路等价。建议级。
- report 部分字面 grep 未 `-F`（Standards §3）；与本席 `grep -F` 计数相同。
- 未造并发双 move 撞 version 的竞态（过期 version 409 已覆盖失败路径不写 inbox）。
