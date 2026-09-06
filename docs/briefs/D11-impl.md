# D11 · inbox 补漏：`/api/tasks/:id/move` 的 agent 状态变更进收件箱（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/11>（`gh issue view 11 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」3 条。** 背景：#9 的实现（main `198b31a`）与 `docs/briefs/D9-impl.md`（只当参考）。

席位：`codex-sol`。分支：`spec/11`，**baseSha = `bfeec53`**（taskboard main，写单时 HEAD；行号取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：`server/app.mjs`、`server/database.mjs`、`test/inbox.test.mjs`。**其余一律不动**：`web/**`、`cli/**`、`shared/**`、`scripts/**`、`docs/**`、`package.json`、`package-lock.json`、`AGENTS.md`、`CLAUDE.md`、`README*`、`.teams-orca*.json`、`dist/**`。

## 先装依赖

`npm install > /tmp/npm-d11.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，**不要软链主仓**）。

## 基线取值（协调席已在 bfeec53 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                      # e=0；# tests 129 # pass 129 # fail 0；vitest「Tests 13 passed」
grep -c '#statusChangeInboxItem(' server/database.mjs            # 0
grep -c '.emit("inbox.item.created"' server/app.mjs              # 2
grep -cE '^test\(' test/inbox.test.mjs                           # 8
grep -oE '\.emit\("[a-z.]+"' server/app.mjs | sort -u | wc -l    # 17
```

## 扩展点（行号取自 bfeec53，以内容为准）

- **规则表**：`server/database.mjs:19` `INBOX_STATUS_SEVERITIES`（in_review / blocked / done）；状态中文 `TASK_STATUS_LABELS_ZH`（同文件靠前）。
- **现有写入块**：`server/database.mjs:1571-1590`（`updateTask` 事务内、`#recordTaskActivity` 之后）：`actor.type === "agent" && 状态变了 ? INBOX_STATUS_SEVERITIES[status] : null` → `this.#createInboxItem({ taskId, projectId, kind: "status_changed", severity, summary: \`Agent 把「${title}」改为 ${中文}\`, actor, sourceId: null, timestamp })`；返回前 `Object.defineProperty(task, "inboxItem", { value: inboxItem })`。**把这一段抽成私有方法** `#statusChangeInboxItem({ current, status, title, projectId, actor, timestamp })`（返回 item 或 `null`），`updateTask` 改为调用它（行为不变，既有 8 个 inbox 用例必须原样绿）。
- **补漏点**：`server/database.mjs:1599` `moveTask(id, version, status, sortOrder, threadId, threadBinding, actor)`：事务内 `#recordTaskActivity(...)` 之后调用同一个 `#statusChangeInboxItem`（`status !== current.status` 才可能非 null；同列重排 `status === current.status` 返回 null）；`COMMIT` 后 `const task = this.getTask(current.id); Object.defineProperty(task, "inboxItem", { value: inboxItem }); return task;`，与 `updateTask` 尾部一致。`projectId` 用 `current.projectId`（move 不换项目）。
- **路由**：`server/app.mjs:1755-1770` move 分支：`events.emit("task.moved", { task })` 之后加 `if (task.inboxItem) { events.emit("inbox.item.created", { item: task.inboxItem, task }); }`，照 `:1737-1739` PATCH 分支的写法逐字。
- **actor**：`server/app.mjs:458` `actorFromRequest`，`x-taskboard-client: taskctl` → agent。不改。
- **测试**：`test/inbox.test.mjs` 现有 helper（`startServer` `:20` / `request` `:29` / `createTask` `:48` / `agentStatus` `:57` / `unreadInbox` `:67`）；加一个 `agentMove(baseUrl, task, status, extra = {})` helper（POST `/api/tasks/:id/move`，头 `AGENT_HEADERS`，body `{ version, status, threadId: "thread-1", ...extra }`）与 `userMove`（不带 agent 头）。SSE 用例照 `:217` 那条的读流写法。**只许新建用例，不改既有 8 条**。

## 你要做的 6 件（= 议题验收 ①–⑥）

**① 抽 helper**：`#statusChangeInboxItem` 恰 1 定义 + 2 调用；`INBOX_STATUS_SEVERITIES[` 与 `kind: "status_changed"` 全文件各恰 1 处（都只在 helper 里）。
**② 路由 emit**：move 分支加 `inbox.item.created`；不加新事件名（总数仍 17）。
**③ 六个新用例**（标题逐字含议题③的六个串）：`agent move in_review -> action_required`（断言 `unreadCount` 1、`kind`、`severity`、`summary` = `Agent 把「<标题>」改为 等你确认`、`actor.type` agent）；`agent move blocked -> attention`；`agent move done -> info`；`agent move same status -> none`（先 agent PATCH 到 in_review 得 1 条，再 agent move `in_review` + `sortOrder` → 仍 1）；`user move in_review -> none`（无 agent 头 POST /move → 0）；`inbox SSE broadcasts on move`（抓 `/api/events`，agent move 后收到 `inbox.item.created` 且 data 含 `item` / `taskId` / `projectId`）。
**④ 冒烟**：下节 6 步全段贴 report。
**⑤ 回归**：`npm run check` e=0，node ≥ 135 / fail 0，vitest ≥ 13；不删既有用例；pathspec 外零 diff；活库副本段。
**⑥ 审查**：不归你；你的 report 头行 PASS / FAIL / BLOCKED 真实。

## 冒烟（端口 47999，临时 DATA_DIR；逐字跑，全段贴 report）

```
D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; U=http://127.0.0.1:47999; A='x-taskboard-client: taskctl'; J='content-type: application/json'
# 1 抓 SSE
curl -s -N $U/api/events > $D/events.log 2>&1 &
# 2 agent 建任务
R=$(curl -s -X POST $U/api/tasks -H "$A" -H "$J" -d '{"projectId":"local","title":"move 冒烟","threadId":"smoke"}'); TID=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["id"])'); echo "$TID"
# 3 agent 经 taskctl move → in_review（真实 CLI 路径）
TASKBOARD_URL=$U node cli/taskctl.mjs issue move "$TID" --status in_review --thread-id smoke --json > $D/move1.json 2>&1; echo "cli e=$?"; cat $D/move1.json; echo
V=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["task"]["version"])' $D/move1.json)
curl -s $U/api/inbox; echo       # unreadCount 1；items[0].kind status_changed；severity action_required；summary Agent 把「move 冒烟」改为 等你确认
# 4 agent 同状态 move（重排，不进）
R=$(curl -s -X POST $U/api/tasks/$TID/move -H "$A" -H "$J" -d "{\"version\":$V,\"status\":\"in_review\",\"sortOrder\":5000,\"threadId\":\"smoke\"}"); V=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])')
curl -s $U/api/inbox | python3 -c 'import json,sys;print("unreadCount", json.load(sys.stdin)["unreadCount"])'   # 1
# 5 user move → blocked（不进）
R=$(curl -s -X POST $U/api/tasks/$TID/move -H "$J" -d "{\"version\":$V,\"status\":\"blocked\"}"); V=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])')
curl -s $U/api/inbox | python3 -c 'import json,sys;print("unreadCount", json.load(sys.stdin)["unreadCount"])'   # 1
# 6 agent move → done（进，info）
R=$(curl -s -X POST $U/api/tasks/$TID/move -H "$A" -H "$J" -d "{\"version\":$V,\"status\":\"done\",\"threadId\":\"smoke\"}"); echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["status"])'
curl -s $U/api/inbox | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["unreadCount"], d["items"][0]["kind"], d["items"][0]["severity"])'   # 2 status_changed info
sleep 1; grep -c '^event: inbox.item.created' $D/events.log; grep -c '^event: task.moved' $D/events.log   # 2 / 4
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); kill %1 2>/dev/null; echo "smoke done"
```

第 3 步 CLI 若因参数形状报 `USAGE_ERROR`，按 `cli/taskctl.mjs:80-90`（`issue move` 允许的选项集）与 `:818` `moveIssue` 调整调用，**不改 CLI**；调整后的命令原样贴 report。

活库副本（协调席派任务时给目录 `<LIVE>`，里面是 `taskboard.sqlite` 的副本；**不许碰主仓 `.data/`**）：
```
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=<LIVE> node server/index.mjs > /tmp/live.log 2>&1 &
sleep 2; curl -s http://127.0.0.1:47998/health; echo; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:47998/api/inbox   # {"status":"ok"} / 200
kill $(lsof -tiTCP:47998 -sTCP:LISTEN)
```

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# tests` ≥ 135 `# fail 0`；vitest `Tests N passed` N ≥ 13 |
| `server/**` | 冒烟 6 步全段 + 活库副本段 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- `test/**` 既有用例一个不删不改（`git diff $base..HEAD -- test/ | grep -cE '^-\s*(test|it)\('` = 0；`test/inbox.test.mjs` 既有 8 条标题原样在）。
- `updateTask` 抽 helper 后行为不变：既有 `agent in_review -> action_required` 等 6 条规则用例与 SSE 用例原样绿；`task.inboxItem` 形状不变。
- 既有 17 个事件名与 payload 不变；既有路由路径、响应形状、错误码不变；`#recordTaskActivity` 不动；`assertTrustedNetworkRequest` 不动。

## 验收口径

议题 ①–⑥ 逐条，判据命令逐字跑并贴取值；审查席会重跑同一套。冒烟里每条「预期」都是判据。

## 提交纪律

- **恰一个 commit**：`git add -- server/app.mjs server/database.mjs test/inbox.test.mjs` → `git commit -m "fix(inbox): agent status changes via /api/tasks/:id/move create inbox items (#11)"`。commit 后 `git show --stat HEAD | grep -cE '^ (server/app.mjs|server/database.mjs|test/inbox.test.mjs) '` = 3 且 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 3。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec 三个文件；发现必须改别处才能做完 = BLOCKED 请示，不要自己扩范围。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d11-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "<csv>" --report-path /Users/happy/projects/taskboard/.scratch/d11-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–⑤ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 冒烟 6 步 + 活库副本段原文 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（没核到的写这里）。
