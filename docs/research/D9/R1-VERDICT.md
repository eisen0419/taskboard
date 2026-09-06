PASS
reviewedHead: b7084c9a0657cebb744799a5405cac776c634abf
fixedPoint: 23f5bfaa528e644e5d807bdfa6bed1651495141d
diffCommand: git diff 23f5bfaa528e644e5d807bdfa6bed1651495141d..b7084c9a0657cebb744799a5405cac776c634abf
commits: b7084c9 feat(inbox): agent-triggered inbox items with /api/inbox, SSE and web view (#9)
implReport: /Users/happy/projects/taskboard/.scratch/d9-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/9 （验收 8 + Out of scope 5；comments 空）
conclusion: 逐条核过（①–⑧ 命令与取值均为本席亲跑；补充打点 1–6 亲跑；逃避清单对 `23f5bfaa..b7084c9` 机械核；未开浏览器点收件箱页签，见「局限」；未改交付物、未 push）

验收 8 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到 ⑦做到 ⑧做到。Out of scope 5 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

## Standards 轴

汇总：写入规则落在 `updateTask` / `createComment` 同事务内、CHECK/索引与议题①逐字、InboxView 零 fetch、无新依赖；report 退出码无管道。§3 违反（report 部分字面 `grep` 未加 `-F`）；本席用 `grep -F` 重跑计数相同。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d9r.log 2>&1; e=$?` → `0`；`npm run check > /tmp/check-d9r.log 2>&1; e=$?` → `e=0`，`ℹ tests 129` / `ℹ pass 129` / `ℹ fail 0`，vitest `Tests  13 passed (13)`，与 report 一致。新哨兵/变异：不适用（本议题无 orca-lab 变异门）。 |
| §3 本机工具陷阱 | 违反（report 字面 grep 部分无 `-F`）；本席重跑符合 | report ⑤ `grep -c '.emit("inbox.item.created"'` / `grep -c '.emit("inbox.updated"'` 未 `-F`（ugrep 下 `.` 是正则；针无 `$`，本席 `grep -cF` 仍各 **2**）。② 六串 report 用了 `grep -c -F`。无 awk `==`、无 `ps \| grep`、无 `pgrep -f` 等待环。 |
| §6 测试与断言 | 符合 | `test/inbox.test.mjs` 经 `createTaskboardServer` 真 HTTP；summary / severity 期望为字面量；`user in_review -> none` 无 agent 头 PATCH 后再 GET `/api/inbox`（`:120-129`）。无新增 `.skip(` / `.only(` / `@ts-ignore` / `@ts-nocheck`。未 mock `database` / `EventHub`。SSE 单测只数 `event:` 行、不锁 payload 键，见局限。 |
| 写入点 | 符合 | `server/database.mjs:1571-1587` `updateTask` 同事务 INSERT；`:2022-2032` `createComment` 同事务 INSERT。路由只 `if (task.inboxItem)` / `if (comment.inboxItem)` 后 `events.emit`（`server/app.mjs:1477-1478`、`:1737-1738`），不在路由层重推状态。`#recordTaskActivity` 仍在 inbox INSERT 之前按原样调用（`:1570`）。 |
| `inbox_items` CHECK + 索引 | 符合 | `server/database.mjs:511-532`：`CHECK (kind IN ('status_changed', 'comment_created'))`、`CHECK (severity IN ('action_required', 'attention', 'info'))`、`actor_type CHECK ('user', 'agent')`、`REFERENCES tasks(id) ON DELETE CASCADE`；索引 `(read_at, archived_at, created_at)` 与 `(task_id)`。本席 `grep -c` / `grep -cE` 议题①三条各 **1**。 |
| 逻辑未塞进 App.tsx | 符合 | UI 在 `InboxView.tsx`（props 与议题⑥一致）；App 只状态 / `refreshInbox` / 四个 handler / 页签。`InboxView.tsx` 对 `fetch` / `listInbox` / `updateInbox` / `readAll` 计数 0。 |
| 无新依赖 | 符合 | `git diff 23f5bfaa..b7084c9 -- package.json` 只 `test:components` 一行一删一增（`grep -cE '^[-+] '` → **2**）；`package-lock.json \| wc -l` → **0**。 |
| Fowler 味道 | 判断调用，非硬违反 | `updateTask` 加长（inbox 段 `:1544-1596`）；`listInbox` / `getInboxItem` JOIN 形状重复。Shotgun Surgery 不适用（db/app/web/test 是本议题必要面）。`Object.defineProperty(task/comment, "inboxItem")` 保既有 JSON 形状，非猜测性抽象。`EventHub.emit` 给 `value.item` 补 fallback（`app.mjs:818-819`）是兼容扩展，既有 15 个事件名未改。 |

Worst within Standards: report 字面 `grep` 未加 `-F`（§3）。计数仍可信。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `23f5bfaa..b7084c9`（审查开始时实现 commit 恰 1）。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 数据层 | 做到 | `grep -c 'CREATE TABLE IF NOT EXISTS inbox_items' server/database.mjs` → **1**。`grep -cE "CHECK \(severity IN \('action_required', 'attention', 'info'\)\)"` → **1**。`grep -cE "CHECK \(kind IN \('status_changed', 'comment_created'\)\)"` → **1**。表列与 `ON DELETE CASCADE`、两索引见 `database.mjs:511-532`。 |
| ② 写入规则 | 做到 | `grep -cE '^test\(' test/inbox.test.mjs` → **8**。六字面串各 `grep -c -F` → 各 **1**（`agent in_review -> action_required` / `agent blocked -> attention` / `agent done -> info` / `agent in_progress -> none` / `user in_review -> none` / `agent comment -> attention`）。`node --test test/inbox.test.mjs > /tmp/inbox-unit.log 2>&1; e=$?` → `e=0`，`ℹ tests 8` / `ℹ pass 8` / `ℹ fail 0`。summary 字面 `Agent 把「…」改为 等你确认/遇到阻碍/完成`；评论摘要前 80 字。`TASK_STATUS_LABELS_ZH`（`database.mjs:10-18`）与 `web/src/i18n.tsx` zh 表一致。 |
| ③ 读路由 | 做到 | `grep -c 'pathname === "/api/inbox"' server/app.mjs` → **1**。冒烟 GET `/api/inbox` → `unreadCount` **1**，`items[0].severity=action_required`，`kind=status_changed`，`taskTitle="inbox 冒烟"`，键序 `{"items":[...],"unreadCount":1}`。`?foo=1` → **400** `UNKNOWN_QUERY_PARAMETER`。user PATCH `blocked` 后 `unreadCount` 仍 **1**。`?state=all` `items` 长度 **2**。`?state=archived` → **400** `INVALID_FIELD`。`listInbox` 独立 COUNT、`ORDER BY created_at DESC, id DESC`、`LIMIT 200`（`database.mjs:1915-1932`）。 |
| ④ 写路由 | 做到 | `grep -c 'INBOX_ITEM_NOT_FOUND' server/app.mjs` → **1**。冒烟 PATCH `{"state":"read"}` → 200 且 `item.readAt` 非 null、`archivedAt` null。未知 id → **404** `INBOX_ITEM_NOT_FOUND`。`{"state":"x"}` → **400** `INVALID_FIELD`。agent 评论后再 `POST /api/inbox/read-all` → `{"updated":1}`。`parseInboxItemPatch` `assertAllowedKeys(body, new Set(["state"]))`（`app.mjs:654-660`）；GET/POST/PATCH 405 走 `methodNotAllowed`（代码；本席未另 curl 405，见局限）。 |
| ⑤ SSE | 做到 | `grep -c '.emit("inbox.item.created"' server/app.mjs` → **2**（≥1）。`grep -c '.emit("inbox.updated"' server/app.mjs` → **2**。冒烟 `grep -c '^event: inbox.item.created' $D/events.log` → **2**；`grep -c '^event: inbox.updated'` 在 8 步结束时 → **2**（其后补充打点又产生更多 updated）。emit 形状 `{ item, task }` / `{ item }` / `{ updated }`（`app.mjs:1308`、`:1330`、`:1478`、`:1738`）。 |
| ⑥ Web | 做到 | `test -f web/src/components/InboxView.tsx; echo $?` → **0**。`grep -cE 'boardView === "inbox"' web/src/App.tsx` → **3**（≥2）。`grep -c 'event.type.startsWith("inbox.")' web/src/App.tsx` → **1**。`grep -c 'data-testid="inbox-unread-count"' web/src/App.tsx` → **1**（`inboxUnreadCount > 0` 才渲染）。`grep -cE '^\s*(test|it)\(' web/src/components/InboxView.test.tsx` → **4**（severity 标签、标为已读回调、空态「收件箱是空的」、另含打开/归档）。`grep -c 'InboxView.test.tsx' package.json` → **1**。`npm run typecheck > /tmp/typecheck-d9r.log 2>&1; e=$?` → **0**。空态 `text("收件箱是空的", "Inbox is empty")`；页签 `text("收件箱", "Inbox")`。`onOpenTask` → `setBoardView("issues")` + `openTaskDetail`（`App.tsx:725-744`）。 |
| ⑦ 回归 | 做到 | `npm run check > /tmp/check-d9r.log 2>&1; e=$?` → **0**；`ℹ tests 129` / `ℹ pass 129` / `ℹ fail 0`；vitest `Tests  13 passed (13)`（≥12）。`git diff 23f5bfaa..HEAD -- test/ web/src/components/MarkdownDocument.test.tsx \| grep -cE '^-\s*(test\|it)\('` → **0**。`grep -oE '\.emit\("[a-z.]+"' server/app.mjs \| sort -u \| wc -l` → **17**（base 15 个全保留，新增 `inbox.item.created` / `inbox.updated`）。既有 pathname 只多 `/api/inbox` 与 `/api/inbox/read-all`。`package.json` `^[-+] ` → **2**；lock `wc -l` → **0**。既有 `test(` 在 base = **121**，HEAD 含 inbox = **129**。 |
| ⑧ 冒烟 + 活库 | 做到 | 8 步改端口 **47998**、临时 `TASKBOARD_DATA_DIR` 亲跑：build `e=0`；GET inbox 形状见③；user blocked 后 unreadCount 1；PATCH read 200；404/400；评论后 `1 comment_created attention`；`state=all` 长度 2；`{"updated":1}`；unreadCount 0；SSE created/updated 各 ≥2。活库 `TASKBOARD_DATA_DIR=/Users/happy/projects/taskboard/.scratch/d9-native/live` 端口 47998：`/health` = `{"status":"ok"}`；`GET /api/inbox` = `{"items":[],"unreadCount":0}`。47998 用完已杀；47823 pid 仍 **96534**。 |

Out of scope：

- 去重/折叠、通知偏好、user 触发、邮件：user PATCH `in_review` / `blocked` 均不进箱（测试 + 冒烟 + 本席另造「user负例」curl，unreadCount 0→0）。没做（正确）。
- `taskctl inbox`：`git diff --name-only 23f5bfaa..b7084c9 -- cli` 空；`grep inbox cli/taskctl.mjs` 空。没做（正确）。
- 既有 15 事件名 / 路由 / 枚举 / `task_activities`：事件名 comm 只新增 2 个、删除 0；状态中文表未改 `i18n.tsx`（server 侧复制常量）。`EventHub.emit` 在链尾加 `value.item` fallback，既有 `{ task }` / `{ comment, task }` 取值不变。没做错。
- `docs/**` `AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `README*` `shared/**`：`git diff --name-only` 对这些 pathspec 空。`package.json` 只改 `test:components`。没做错。
- 47823 / 主仓 `.data/`：commit 不含 `.data/`；本席未碰 47823。没做错。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `23f5bfaa..b7084c9`）：

1. 断言删除：`--diff-filter=D -- test/ web/src/components/MarkdownDocument.test.tsx` 空。删除行含 `assert|expect`：空。新增 `\.skip\(|\.only\(|@ts-ignore|@ts-nocheck`：空。`# tests` = **129**（不 < 129）。`git diff -- test/ ':!test/inbox.test.mjs'` `wc -l` → **0**。未命中。
2. 守卫：diff 无新增 `|| true`、无新增空 `catch`。`assertAllowedQuery` / `assertAllowedKeys` 对新路由是**新增调用**（`app.mjs:1295`、`:1305`、`:1324`、`:656`），不是绕过；`assertTrustedNetworkRequest` 仍在 handler 入口 `:1054`（新路由在其后，自然受保护）。未命中。
3. 门禁：commit message 与 diff 无 `--no-verify` / `--force`。未命中。
4. 判据：`docs/briefs/**` `docs/agents/**` `docs/research/**` `AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `cli/**` 无 diff。未命中。
5. 验证替代：`test/inbox.test.mjs` 无 mock/stub `database` 或 `EventHub`（走 `createTaskboardServer`）。`InboxView.test.tsx` 的 `vi.fn` 是 props 回调，不是判定链替身。冒烟 `DATA_DIR` = `mktemp -d` 空库，不是 fixture。未命中。

清单 5 项全 0。

其它：

1. **user 负例经过真判定链**：是。`test/inbox.test.mjs:120-129`：无 `x-taskboard-client` 的 PATCH `in_review`（200）后再 `GET /api/inbox`，断言 `{ items: [], unreadCount: 0 }`。本席冒烟后另 curl 无 agent 头 PATCH `in_review`：unreadCount before **0** after **0**。
2. **归档即已读**：是。`PATCH {"state":"archived"}` → `readAt=2026-09-06T16:37:08.874Z` 且 `archivedAt` 同值（均非 null）；再 `unread` → `readAt` null 且 `archivedAt` null。
3. **级联删除**：是。`POST /archive` 后 `DELETE /api/tasks/:id` → **204**；`GET /api/inbox` **200** `{"items":[],"unreadCount":0}`（不 500）；`?state=all` 不再含原 `IID=054c314e-…`（`contains_old_iid False`）。`PRAGMA foreign_keys = ON` 在 `database.mjs:413`。
4. **Host/Origin**：是。`curl -X PATCH http://127.0.0.1:47998/api/inbox/x -H 'Origin: https://evil.example' …` → **403** `{"error":{"code":"INVALID_ORIGIN",…}}`（先于 404）。
5. **SSE payload**：是。`inbox.item.created` data 键含 `projectId='local'`、`taskId=<uuid>`、`item`、`task`（2 条）。`inbox.updated`：PATCH 带 `item` + 顶层 `projectId`/`taskId`；read-all 带 `updated`（无 item，`projectId`/`taskId` 为 null）。
6. **前端体积与分层**：`git diff --stat 23f5bfaa..HEAD -- web/src/App.tsx` 原文：
   ```
    web/src/App.tsx | 113 +++++++++++++++++++++++++++++++++++++++++++++++++++++++-
    1 file changed, 111 insertions(+), 2 deletions(-)
   ```
   `InboxView.tsx` 零 fetch（数据由 App 传入）。

另核：审查开始时 `git rev-list --count 23f5bfaa..HEAD` = **1**；`git show --stat HEAD` 外来文件 **0**（10 文件均在 `server/` `web/src/` `test/inbox.test.mjs` `package.json`）。`git ls-remote --heads origin spec/9` 空、`git branch -r --list 'origin/spec/9'` 空（未 push）。`git diff 23f5bfaa..HEAD -- package-lock.json | wc -l` = **0**。`git log --format=%b 23f5bfaa..HEAD | grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --check` 空。

## 局限

- 未开浏览器点「收件箱」页签；Web 轴以组件测 + App 分支 + typecheck 为准。
- SSE 单测（`test/inbox.test.mjs:217-252`）只数 `event:` 行，不锁 `item` / `projectId` / `taskId`；payload 由本席抓包核过，不构成产品缺陷。
- `POST /api/tasks/:id/move` 改 status 不写 inbox（写入只在 `updateTask`）。议题把写入点钉在 `updateTask`；user 拖拽本就不该进箱。建议级。
- 未造 201 条验证 `LIMIT 200` 截断；SQL 有 `LIMIT 200`。
- 未另 curl 405；代码 `methodNotAllowed` 在三条新路由上。
- `refreshInbox` 失败走 `console.error`（`App.tsx:1038`），不进 `actionError`。建议级。
- report 部分字面 grep 未 `-F`（Standards §3）；与本席 `grep -F` 计数相同。
- `EventHub.emit` 为 `value.item` 增加 fallback：既有 15 个事件在有 `task`/`comment`/`attachment` 时取值不变。
