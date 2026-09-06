# D9 · inbox 通知：agent 触发的状态变更与评论进收件箱（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/9>（`gh issue view 9 --comments`）——判据真源是它的「验收（可数）」8 条与「Out of scope」5 条。** 背景材料：main 上 `docs/research/D7/multica-reference-2.md` F1 / F2（只当参考，不照抄 multica 的表结构）。

席位：`codex-sol`。分支：`spec/9`，**baseSha = `4c5a416`**（taskboard main，写单时 HEAD；行号与基线取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：`server/app.mjs`、`server/database.mjs`、`web/src/**`（含新建 `web/src/components/InboxView.tsx` / `InboxView.test.tsx`）、`test/inbox.test.mjs`（新建）、`package.json`（**只许改 `test:components` 一行**）。其余一律不动：`package-lock.json`（不加依赖，diff 必须为 0）、`shared/**`、`cli/**`、`scripts/**`、`docs/**`、`AGENTS.md`、`CLAUDE.md`、`README*`、`.teams-orca*.json`、`dist/**`（gitignore，`npm run build` 产物不入 commit）。

## 先装依赖

`npm install > /tmp/npm-d9.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，**不要软链主仓**）。

## 基线取值（协调席已在 4c5a416 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                     # e=0；node --test 尾三数 # tests 121 # pass 121 # fail 0；vitest「Tests 9 passed」
grep -oE '\.emit\("[a-z.]+"' server/app.mjs | sort -u | wc -l   # 15
grep -c 'CREATE TABLE IF NOT EXISTS inbox_items' server/database.mjs   # 0
ls test/inbox.test.mjs web/src/components/InboxView.tsx 2>&1 | grep -c 'No such'   # 2
```

## 扩展点（行号取自 4c5a416，以内容为准）

- **表**：`server/database.mjs:457` `task_activities` 的建表写法（`CREATE TABLE IF NOT EXISTS` + 索引，同一段 `db.exec`）；照它在同一处加 `inbox_items`。actor 三列（`actor_type` CHECK `('user','agent')`、`actor_id`、`actor_name`）沿用。
- **写入点**：`server/database.mjs:1384` `updateTask(id, version, changes, threadId, threadBinding, actor)`——状态变更就在这里能拿到 `current.status` 与新 `status` 与 `actor`；`:1851` `createComment(taskId, input)`——`input.actor`。**在这两处之后**（同一事务内或紧随其后）按规则写 `inbox_items`，返回值里带上新建的 item，交给路由层 emit。不要改 `#recordTaskActivity`（`:2231`）的行为。
- **路由层**：`server/app.mjs:1668` PATCH `/api/tasks/:id`（`events.emit("task.updated", { task })` 之后 emit `inbox.item.created`）；`:1396` 评论 POST（`events.emit("comment.created", …)` 之后同样）；新路由 `pathname === "/api/inbox"` 放在 `:1284` `/api/tasks` 之前或之后都行，`/api/inbox/read-all` 与 `/api/inbox/:id` 用 `pathname.match(/^\/api\/inbox\/([^/]+)$/)` 形状（参考 `:1432` `commentRoute`）；query 校验用 `:196` `assertAllowedQuery(searchParams, new Set(["state"]), "GET /api/inbox")`；错误码用 `ApiError(404, "INBOX_ITEM_NOT_FOUND", …)` / `ApiError(400, "INVALID_FIELD", …)`；405 用 `:871` `methodNotAllowed`。
- **actor**：`server/app.mjs:458` `actorFromRequest`——`x-taskboard-client: taskctl` → `AGENT_ACTOR`（`:36`，`type: "agent"`），否则 `type: "user"`。写入规则只看 `actor.type === "agent"`。
- **SSE**：`server/app.mjs:785` `EventHub.emit(type, value)`：payload 自动补 `projectId` / `taskId`（从 `value.task` 取），所以 emit 时传 `{ item, task }` 或让 item 自带 `projectId` / `taskId`。两个新事件名逐字：`inbox.item.created`、`inbox.updated`。
- **Web**：`web/src/App.tsx:118` `type BoardView`，`:202` `readProjectBoardView`（两处都要认 `"inbox"`）；`:305` `EventSource`，`:326-360` 事件分发（加一行逐字 `if (event.type.startsWith("inbox.")) { … }`，判据 grep 这个串）；`:2000` 附近视图页签（`view-tab` 按钮，复制「仪表盘」那颗，文案 `text("收件箱", "Inbox")`，徽标元素带 `data-testid="inbox-unread-count"`）；`:2200` 附近按 `boardView` 渲染主区（加 `boardView === "inbox"` 分支渲染 `<InboxView …/>`）。API 函数加在 `web/src/api.ts`（照 `:123` `listProjects` 的写法：`listInbox(state)` / `updateInboxItem(id, state)` / `readAllInbox()`），类型加在 `web/src/types.ts`（`InboxItem`）。文案一律 `text("中文", "English")`（`web/src/i18n.tsx`）。
- **组件测试**：`web/src/components/MarkdownDocument.test.tsx` 是现成样板（`@testing-library/react` + vitest jsdom）；`package.json:22` `test:components` 目前只跑这一个文件，把 `web/src/components/InboxView.test.tsx` 追加进同一行（空格分隔），别改成 glob（`InlineMediaComposer.test.tsx` 现在不在跑，别把它带进来）。
- **服务端测试**：`test/server.test.mjs:22` `startServer` / `:31` `request` 两个 helper 复制到 `test/inbox.test.mjs`（或抽公共文件——不要，只许新建这一个测试文件）；agent 身份 = 请求头 `x-taskboard-client: taskctl`；SSE 断言照 `:959` 那段（`fetch(/api/events)` 读 body 流）。

## 你要做的 8 件（= 议题验收 ①–⑧）

**① 表**：`inbox_items(id PK, task_id → tasks ON DELETE CASCADE, project_id, kind CHECK('status_changed','comment_created'), severity CHECK('action_required','attention','info'), summary, actor_type CHECK('user','agent'), actor_id, actor_name, actor_avatar_url NULL, source_id NULL, created_at, read_at NULL, archived_at NULL)` + 索引 `(read_at, archived_at, created_at)`、`(task_id)`。CHECK 子句逐字按议题①（判据 grep 逐字）。
**② 写入规则**：agent 且状态变为 `in_review` → action_required / `blocked` → attention / `done` → info；其他状态不写；agent 评论 → attention（summary 用评论前 80 字）；user 任何操作不写。`summary` 中文，形如 `Agent 把「<标题>」改为 <状态中文>`（状态中文表照 `web/src/i18n.tsx` zh 那份复制到 server 侧一个常量，别 import web）。测试用例标题含议题②的六个字面串。
**③ GET /api/inbox**：`state` ∈ `unread`（默认：`read_at IS NULL AND archived_at IS NULL`）| `all`；其他值 400 `INVALID_FIELD`；未知参数 400 `UNKNOWN_QUERY_PARAMETER`；响应 `{ items, unreadCount }`（**键顺序 items、unreadCount**；`unreadCount` 永远是未读未归档总数，不随 state 变）；item 字段 `id taskId projectId taskTitle kind severity summary actor{type,id,name,avatarUrl} createdAt readAt archivedAt`；`created_at DESC, id DESC`；上限 200。
**④ PATCH /api/inbox/:id + POST /api/inbox/read-all**：body 只许 `state`（`assertAllowedKeys`），`read` → 置 `read_at`、清 `archived_at`；`unread` → 清两者；`archived` → 置 `archived_at`（`read_at` 同时置，归档即已读）；返回 `{ item }`。`read-all` 把所有未读未归档置已读，返回 `{ updated }`。405 走 `methodNotAllowed`。
**⑤ SSE**：新建 → `events.emit("inbox.item.created", { item, task })`；PATCH / read-all → `events.emit("inbox.updated", { item })` / `{ updated }`。
**⑥ Web**：`InboxView.tsx`（props：`items` `unreadCount` `onMarkRead(id)` `onArchive(id)` `onReadAll()` `onOpenTask(item)`；每行：severity 标签（三档三个 class）、summary、`taskTitle`（点击 `onOpenTask`）、两个按钮；顶部「全部已读」；空态 `text("收件箱是空的", "Inbox is empty")`）；App.tsx：状态 `inboxItems` / `inboxUnreadCount`、`refreshInbox()`、SSE 分发一行逐字 `event.type.startsWith("inbox.")`、页签 + 徽标 `data-testid="inbox-unread-count"`（未读 0 时不渲染徽标）、`boardView === "inbox"` 分支；`onOpenTask` 走现有打开议题的路径（`:681` 附近 `boardView === "issues" && fullTask` 那套，或直接 `setBoardView("issues")` + 选中任务，二选一，别新造路由）。样式加在 `web/src/styles.css`。`InboxView.test.tsx` ≥ 3 用例。
**⑦ 回归**：`npm run check` e=0，node ≥ 129 / fail 0，vitest ≥ 12；不删既有用例；事件名 15 → 17；不加依赖。
**⑧ 冒烟**：下节 8 步全段贴 report；活库副本起一次（路径协调席派任务时给）。

## 冒烟（端口 47999，临时 DATA_DIR；逐字跑，全段贴 report）

```
D=$(mktemp -d); npm run build > $D/build.log 2>&1; e=$?; echo "build e=$e"          # e=0
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; U=http://127.0.0.1:47999; A='x-taskboard-client: taskctl'; J='content-type: application/json'
# 1 抓 SSE
curl -s -N $U/api/events > $D/events.log 2>&1 &
# 2 agent 建任务
R=$(curl -s -X POST $U/api/tasks -H "$A" -H "$J" -d '{"projectId":"local","title":"inbox 冒烟","threadId":"smoke"}'); TID=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["id"])'); V=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])'); echo "$TID $V"
# 3 agent → in_review
R=$(curl -s -X PATCH $U/api/tasks/$TID -H "$A" -H "$J" -d "{\"version\":$V,\"status\":\"in_review\",\"threadId\":\"smoke\"}"); V=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])')
# 4 读
curl -s $U/api/inbox; echo                                        # unreadCount 1；items[0].severity action_required；kind status_changed；taskTitle "inbox 冒烟"
curl -s -o /dev/null -w '%{http_code}\n' "$U/api/inbox?foo=1"     # 400
# 5 user → blocked（不进）
R=$(curl -s -X PATCH $U/api/tasks/$TID -H "$J" -d "{\"version\":$V,\"status\":\"blocked\"}"); V=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])')
curl -s $U/api/inbox | python3 -c 'import json,sys;print("unreadCount", json.load(sys.stdin)["unreadCount"])'   # 1
# 6 标已读 + 404 + 400
IID=$(curl -s $U/api/inbox | python3 -c 'import json,sys;print(json.load(sys.stdin)["items"][0]["id"])')
curl -s -X PATCH $U/api/inbox/$IID -H "$J" -d '{"state":"read"}'; echo          # 200，item.readAt 非 null
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH $U/api/inbox/nope -H "$J" -d '{"state":"read"}'   # 404
curl -s -X PATCH $U/api/inbox/$IID -H "$J" -d '{"state":"x"}'; echo            # 400 INVALID_FIELD
# 7 agent 评论 → 第二条；all 看到两条
curl -s -X POST $U/api/tasks/$TID/comments -H "$A" -H "$J" -d '{"body":"冒烟评论","threadId":"smoke"}' > /dev/null
curl -s $U/api/inbox | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["unreadCount"], d["items"][0]["kind"], d["items"][0]["severity"])'   # 1 comment_created attention
curl -s "$U/api/inbox?state=all" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)["items"]))'   # 2
# 8 全部已读
curl -s -X POST $U/api/inbox/read-all; echo                                     # {"updated":1}
curl -s $U/api/inbox | python3 -c 'import json,sys;print(json.load(sys.stdin)["unreadCount"])'   # 0
sleep 1; grep -c '^event: inbox.item.created' $D/events.log; grep -c '^event: inbox.updated' $D/events.log   # ≥2 / ≥2
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); kill %1 2>/dev/null; echo "smoke done"
```

活库副本（协调席派任务时给目录 `<LIVE>`，里面是 `taskboard.sqlite` 的副本；**不许碰主仓 `.data/`**）：
```
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=<LIVE> node server/index.mjs > /tmp/live.log 2>&1 &
sleep 2; curl -s http://127.0.0.1:47998/health; echo; curl -s http://127.0.0.1:47998/api/inbox; echo   # {"status":"ok"} / {"items":[],"unreadCount":0}
kill $(lsof -tiTCP:47998 -sTCP:LISTEN)
```

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# tests` ≥ 129 `# fail 0`；vitest `Tests N passed` N ≥ 12 |
| `server/**` | 冒烟 8 步全段 + 活库副本段 |
| `web/**` | `npm run typecheck` e=0；`dist/web/index.html` 存在（build 后）；InboxView.test.tsx 在 `npm run test:components` 里跑到 |
| `package.json` | `git diff $base..HEAD -- package.json \| grep -cE '^[-+] '` = 2（只 test:components 一行一删一增）；`git diff $base..HEAD -- package-lock.json \| wc -l` = 0 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- `test/**` 既有 121 个用例一个不删不改（`git diff $base..HEAD -- test/ ':!test/inbox.test.mjs' | wc -l` = 0）；`MarkdownDocument.test.tsx` 不动。
- 生产路径**只许加不许改**：`updateTask` / `createComment` 既有返回值与活动记录写法不变；既有 15 个事件名与 payload 不变；既有路由路径、响应形状、错误码不变；`assertTrustedNetworkRequest` 不动（新路由自然受它保护）。
- `App.tsx` 里既有视图切换逻辑不改语义，只加分支。

## 验收口径

议题 ①–⑧ 逐条，判据命令逐字跑并贴取值；审查席会重跑同一套。冒烟里每条「预期」都是判据。

## 提交纪律

- **恰一个 commit**：`git add -A -- server web/src test package.json` → `git commit -m "feat(inbox): agent-triggered inbox items with /api/inbox, SSE and web view (#9)"`。commit 后 `git show --stat HEAD | grep -vE '^ (server/|web/src/|test/inbox.test.mjs|package.json)' | grep -cE '^ [a-zA-Z._/-]+ +\|'` = 0（无越界文件）。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 自证：`git diff-tree -r --numstat --no-commit-id HEAD | wc -l` 取值贴报告（预期 ≥ 8）。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec；`package-lock.json` 有 diff 即停手请示。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`、`/Users/happy/projects/multica-upstream`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。8. 🔴 不加依赖、不改 `shared/` `cli/`；发现必须改它们才能做完 = BLOCKED 请示，不要自己扩范围。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d9-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "<csv>" --report-path /Users/happy/projects/taskboard/.scratch/d9-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–⑧ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 冒烟 8 步 + 活库副本段原文 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（没核到的写这里）。
