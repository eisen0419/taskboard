# D15 · inbox 折叠：同一议题的未读通知合成一行（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/15>（`gh issue view 15 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」4 条。** 背景：D7 F2（`docs/research/D7/multica-reference-2.md`，只当参考，multica 是前端折叠，我们放服务端）；#9 / #11 / #13 的实现（main `198b31a` / `43ebeb8` / `cd1bd28`）。

席位：`codex-sol`。分支：`spec/15`，**baseSha = `a0a605b`**（taskboard main，写单时 HEAD；行号取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：`server/database.mjs`、`server/app.mjs`、`test/inbox.test.mjs`、`web/src/types.ts`、`web/src/components/InboxView.tsx`、`web/src/components/InboxView.test.tsx`、`web/src/styles.css`。**其余一律不动**：`web/src/App.tsx`、`web/src/api.ts`、`cli/**`、`shared/**`、`scripts/**`、`docs/**`、`README*`、`package.json`、`package-lock.json`、`AGENTS.md`、`CLAUDE.md`、`.teams-orca*.json`、`dist/**`。

## 先装依赖

`npm install > /tmp/npm-d15.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，**不要软链主仓**）。

## 基线取值（协调席已在 a0a605b 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                                  # e=0；# tests 141 # pass 141 # fail 0；vitest「Tests 13 passed」
grep -c -F 'collapsed_count' server/database.mjs                             # 0
grep -c -F 'function emitInboxItem' server/app.mjs                           # 0
grep -c '.emit("inbox.item.created"' server/app.mjs                          # 3
grep -cE '^test\(' test/inbox.test.mjs                                       # 14
grep -cE '^\s*(test|it)\(' web/src/components/InboxView.test.tsx             # 4
grep -oE '\.emit\("[a-z.]+"' server/app.mjs | sort -u | wc -l                # 17
```

## 扩展点（行号取自 a0a605b，以内容为准）

- **表**：`server/database.mjs:511` `CREATE TABLE IF NOT EXISTS inbox_items (…)`：在 `archived_at TEXT` 之后加 `collapsed_count INTEGER NOT NULL DEFAULT 1`（逐字，判据 grep）。**迁移**：照 `:573-576` `projects.workspace_path` 的写法：`const inboxColumns = this.database.prepare("PRAGMA table_info(inbox_items)").all(); if (!inboxColumns.some((c) => c.name === "collapsed_count")) { this.database.exec("ALTER TABLE inbox_items ADD COLUMN collapsed_count INTEGER NOT NULL DEFAULT 1"); }`，放在同一段迁移里、建表之后。
- **行映射** `:204` `inboxItemFromRow`：加 `collapsedCount: row.collapsed_count,`（逐字，放 `archivedAt` 之后）。
- **写入** `:2425` `#createInboxItem({ taskId, projectId, kind, severity, summary, actor, sourceId, timestamp })`：先查 `SELECT id, severity FROM inbox_items WHERE task_id = ? AND read_at IS NULL AND archived_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 1`；有 → `UPDATE inbox_items SET kind = ?, severity = ?, summary = ?, actor_type = ?, actor_id = ?, actor_name = ?, actor_avatar_url = ?, source_id = ?, created_at = ?, collapsed_count = collapsed_count + 1 WHERE id = ?`，severity 用 `higherSeverity(existing.severity, severity)`（模块级常量 `INBOX_SEVERITY_RANK = { action_required: 3, attention: 2, info: 1 }`），然后 `return this.getInboxItem(existing.id)`；无 → 现有 INSERT 加 `collapsed_count` 列值 1。两个调用方（`#statusChangeInboxItem` `:2408`、`createComment` `:2022`）已在各自事务内，不用改它们。
- **路由** `server/app.mjs`：新增模块级 `function emitInboxItem(events, task, item) { if (!item) return; events.emit(item.collapsedCount === 1 ? "inbox.item.created" : "inbox.updated", { item, task }); }`，三处（`:1477-1479` 评论、`:1737-1739` PATCH、`:1769-1771` move）改为 `emitInboxItem(events, task, comment.inboxItem)` / `emitInboxItem(events, task, task.inboxItem)`。既有 `inbox.updated` 的两处（PATCH item `:1330`、read-all `:1308`）不动。
- **Web**：`web/src/types.ts:26` `InboxItem` 加 `collapsedCount: number;`（逐字）；`web/src/components/InboxView.tsx:54` severity `<span>` 之后加 `{item.collapsedCount > 1 ? <span className="inbox-collapsed-count" data-testid="inbox-collapsed-count" title={text(\`${item.collapsedCount} 条通知已折叠\`, \`${item.collapsedCount} notifications folded\`)}>×{item.collapsedCount}</span> : null}`；样式加在 `web/src/styles.css` 收件箱那段。组件测试照 `InboxView.test.tsx:42` 的写法加一条 `it("renders the collapsed count badge only when folded", …)`（fixture 一条 `collapsedCount: 3` 断言 `getByTestId("inbox-collapsed-count").textContent` = `×3`，一条 `collapsedCount: 1` 断言 `queryByTestId` 为 null）。既有 4 条 fixture 补 `collapsedCount: 1` 让类型过。
- **服务端测试** `test/inbox.test.mjs`：沿用 helper（`startServer` `:20` / `request` `:29` / `createTask` `:48` / `agentStatus` `:57` / `unreadInbox` `:67`、`agentMove` `:69` 附近）；SSE 用例照 `:217` 那条读流。迁移用例：`mkdtemp` 一个 DATA_DIR，用 `import { DatabaseSync } from "node:sqlite"` 在 `<dir>/taskboard.sqlite` 先 `exec` #9 版建表 SQL（`git show 198b31a:server/database.mjs` 里 `CREATE TABLE IF NOT EXISTS inbox_items` 那段，无 `collapsed_count`；`tasks` 表等由服务启动自建，所以只建 `inbox_items` 一张就够——若 FK 引用 `tasks` 导致建表失败，先 `PRAGMA foreign_keys = OFF`），关掉，再 `startServer` 指向该目录，断言 `PRAGMA table_info(inbox_items)` 含 `collapsed_count`（照 `test/server.test.mjs:227` 的取法）且 `GET /api/inbox` 200。**只许新建用例，不改既有 14 条。**

## 你要做的 6 件（= 议题验收 ①–⑥）

**① 表 + 迁移 + 映射**：三个逐字串各 1；CHECK / 索引不动。
**② 六个新用例**（标题逐字含议题②的六个串）：
- `fold: same task updates the existing unread item`：agent PATCH `in_review` → agent 评论 → `unreadCount` 1、`items[0].id` 不变、`collapsedCount` 2、`kind` `comment_created`、`summary` 以 `Agent 评论` 开头、`createdAt` 晚于第一次。
- `fold: severity keeps the highest`：先 `in_review`（action_required）再评论（attention）→ 仍 `action_required`；另一任务先 `done`（info）再 `in_review` → 变 `action_required`。
- `fold: read items are not folded into`：折叠一次后 PATCH read → 再评论 → `unreadCount` 1、新 `id`、`collapsedCount` 1、`?state=all` 2 行。
- `fold: different tasks do not fold`：两个任务各 `in_review` → 2 行、各 `collapsedCount` 1。
- `fold: SSE emits inbox.updated`：抓 `/api/events`，第一次事件 `inbox.item.created`，第二次同任务事件 `inbox.updated` 且 data 含 `item.collapsedCount` = 2 与 `taskId`。
- `fold: existing inbox_items table gains collapsed_count`：见扩展点。
**③ 路由 helper**：`emitInboxItem` 1 定义 3 调用；`inbox.item.created` 字面只剩 helper 里 1 处；事件名仍 17。
**④ Web**：类型 + 徽标 + 测试 + typecheck；App.tsx 零 diff。
**⑤ 冒烟 + 旧库**：下节全段贴 report。
**⑥ 回归**：`npm run check` e=0，node ≥ 147 / fail 0，vitest ≥ 14；不删既有用例；pathspec 外零 diff。

## 冒烟（端口 47999，临时 DATA_DIR；逐字跑，全段贴 report）

```
D=$(mktemp -d); npm run build > $D/build.log 2>&1; echo "build e=$?"
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; U=http://127.0.0.1:47999; A='x-taskboard-client: taskctl'; J='content-type: application/json'
L() { curl -s $U/api/inbox | python3 -c 'import json,sys;d=json.load(sys.stdin);print("unread",d["unreadCount"],"rows",len(d["items"]), *(f"{i[\"id\"][:8]}:{i[\"kind\"]}:{i[\"severity\"]}:x{i[\"collapsedCount\"]}" for i in d["items"]))'; }
curl -s -N $U/api/events > $D/events.log 2>&1 &
# 1 任务 A：move in_review → 1 行 x1 action_required
R=$(curl -s -X POST $U/api/tasks -H "$A" -H "$J" -d '{"projectId":"local","title":"折叠 A","threadId":"smoke"}'); TA=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["id"])'); V=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])')
R=$(curl -s -X POST $U/api/tasks/$TA/move -H "$A" -H "$J" -d "{\"version\":$V,\"status\":\"in_review\",\"threadId\":\"smoke\"}"); V=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])'); L
# 2 评论 → 仍 1 行 同 id x2 comment_created action_required
curl -s -X POST $U/api/tasks/$TA/comments -H "$A" -H "$J" -d '{"body":"第一条评论","threadId":"smoke"}' > /dev/null; L
curl -s $U/api/inbox | python3 -c 'import json,sys;print(json.load(sys.stdin)["items"][0]["summary"])'      # Agent 评论「第一条评论」
# 3 move done → x3 status_changed 仍 action_required
R=$(curl -s -X POST $U/api/tasks/$TA/move -H "$A" -H "$J" -d "{\"version\":$V,\"status\":\"done\",\"threadId\":\"smoke\"}"); L
# 4 标已读 → unread 0；all 1 行
IID=$(curl -s "$U/api/inbox?state=all" | python3 -c 'import json,sys;print(json.load(sys.stdin)["items"][0]["id"])')
curl -s -X PATCH $U/api/inbox/$IID -H "$J" -d '{"state":"read"}' > /dev/null; L
curl -s "$U/api/inbox?state=all" | python3 -c 'import json,sys;print("all rows", len(json.load(sys.stdin)["items"]))'   # 1
# 5 再评论 → 新 id x1；all 2 行
curl -s -X POST $U/api/tasks/$TA/comments -H "$A" -H "$J" -d '{"body":"第二条评论","threadId":"smoke"}' > /dev/null; L
curl -s "$U/api/inbox?state=all" | python3 -c 'import json,sys;print("all rows", len(json.load(sys.stdin)["items"]))'   # 2
# 6 任务 B：move blocked → unread 2
R=$(curl -s -X POST $U/api/tasks -H "$A" -H "$J" -d '{"projectId":"local","title":"折叠 B","threadId":"smoke"}'); TB=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["id"])'); VB=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])')
curl -s -X POST $U/api/tasks/$TB/move -H "$A" -H "$J" -d "{\"version\":$VB,\"status\":\"blocked\",\"threadId\":\"smoke\"}" > /dev/null; L
# 7 SSE 与 CLI 透传
sleep 1; grep -c '^event: inbox.item.created' $D/events.log; grep -c '^event: inbox.updated' $D/events.log   # 3 / 3
TASKBOARD_URL=$U node cli/taskctl.mjs inbox list --json | grep -c -F '"collapsedCount"'                       # 1
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); kill %1 2>/dev/null; echo "smoke done"
```

旧库（协调席派任务时给目录 `<LIVE>`，里面是 `taskboard.sqlite` 的副本；**不许碰主仓 `.data/`**）：
```
sqlite3 <LIVE>/taskboard.sqlite "PRAGMA table_info(inbox_items)" | grep -c collapsed_count        # 0（起服务前）
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=<LIVE> node server/index.mjs > /tmp/live.log 2>&1 &
sleep 2; curl -s http://127.0.0.1:47998/health; echo
curl -s http://127.0.0.1:47998/api/inbox | python3 -c 'import json,sys;d=json.load(sys.stdin);print("rows",len(d["items"]),"all_x1",all(i["collapsedCount"]==1 for i in d["items"]))'   # all_x1 True
kill $(lsof -tiTCP:47998 -sTCP:LISTEN)
sqlite3 <LIVE>/taskboard.sqlite "PRAGMA table_info(inbox_items)" | grep -c collapsed_count        # 1
```

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# tests` ≥ 147 `# fail 0`；vitest `Tests N passed` N ≥ 14 |
| `server/**` | 冒烟 7 步全段 + 旧库段 |
| `web/**` | `npm run typecheck` e=0；`InboxView.test.tsx` 在 `npm run test:components` 里跑到（`package.json` 已列，不用改） |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- `test/**` 与 `InboxView.test.tsx` 既有用例不删不改（既有 4 条组件 fixture 只许补 `collapsedCount: 1` 字段）。
- 三条路由的路径、错误码、`unreadCount` 语义、`{ items, unreadCount }` 键顺序不变；既有 17 个事件名与既有 payload 键不变（只增 `collapsedCount`）。
- `#statusChangeInboxItem`、`#recordTaskActivity`、`assertTrustedNetworkRequest` 不动；`App.tsx`、`api.ts`、`cli/**` 零 diff。

## 验收口径

议题 ①–⑥ 逐条，判据命令逐字跑并贴取值；审查席会重跑同一套。冒烟里每条「预期」都是判据。

## 提交纪律

- **恰一个 commit**：`git add -- server/database.mjs server/app.mjs test/inbox.test.mjs web/src/types.ts web/src/components/InboxView.tsx web/src/components/InboxView.test.tsx web/src/styles.css` → `git commit -m "feat(inbox): fold unread notifications per task with collapsedCount (#15)"`。commit 后 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` ≤ 7 且每行路径都在 pathspec 内。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec；发现必须改别处才能做完 = BLOCKED 请示，不要自己扩范围。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`；shell 函数（如上 `L()`）可以，**别把命令存进变量再 `$VAR` 展开**（zsh 不分词）。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d15-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "<csv>" --report-path /Users/happy/projects/taskboard/.scratch/d15-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–⑥ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 冒烟 7 步 + 旧库段原文 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（没核到的写这里）。
