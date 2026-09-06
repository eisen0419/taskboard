# D13 · `taskctl inbox` 子命令：list / mark / read-all（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/13>（`gh issue view 13 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」4 条。** 背景：#9 的路由合约（`server/app.mjs:1293-1331`，只读不改）。

席位：`codex-sol`。分支：`spec/13`，**baseSha = `a31a3ee`**（taskboard main，写单时 HEAD；行号取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：`cli/taskctl.mjs`、`test/cli.test.mjs`。**其余一律不动**：`server/**`、`web/**`、`shared/**`、`scripts/**`、`docs/**`、`README*`、`package.json`、`package-lock.json`、`AGENTS.md`、`CLAUDE.md`、`.teams-orca*.json`、`dist/**`。

## 先装依赖

`npm install > /tmp/npm-d13.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，**不要软链主仓**）。

## 基线取值（协调席已在 a31a3ee 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                  # e=0；# tests 135 # pass 135 # fail 0；vitest「Tests 13 passed」
grep -c -F '"inbox list"' cli/taskctl.mjs                    # 0
grep -c -F '/api/inbox' cli/taskctl.mjs                      # 0
grep -cE '^test\(' test/cli.test.mjs                         # 32
node cli/taskctl.mjs --help | grep -c -F '  inbox '          # 0
grep -c -F '"thread-id"' cli/taskctl.mjs                     # 取值记下，交付后必须相同
```

## 扩展点（行号取自 a31a3ee，以内容为准）

- **选项表** `cli/taskctl.mjs:32` `COMMAND_OPTIONS`：在 `["context current", …]` 之前加三行：`["inbox list", new Set(["state", "json"])]`、`["inbox mark", new Set(["state", "json"])]`、`["inbox read-all", new Set(["json"])]`。**不列 `thread-id`**。
- **根帮助** `:116` `HELP_TEXT` 的 `""` 条目 `Commands:` 列表，在 `attachment upload` 那行之后加三行（两空格缩进，与上文对齐）：
  ```
    inbox list [--state unread|all]
    inbox mark ITEM_ID --state read|unread|archived
    inbox read-all
  ```
  判据 `node cli/taskctl.mjs --help | grep -c -F '  inbox '` = 3，所以每行以两空格 + `inbox ` 开头。不加 `["inbox", …]` 帮助作用域；`:275` 那句「Help is available for …」不改。
- **「Expected one of」** `:305`：在 `attachment list/download/upload` 之后、`context current` 之前插 `inbox list/mark/read-all`（逗号分隔，与现有格式一致）。
- **分发** `:316` `switch (command)`：在 `case "context current"` 之前加三个 case：
  - `inbox list`：`expectOperandCount(parsed, 0)`；`--state` 若给且不在 `["unread", "all"]` → `throw usageError("--state must be unread or all")`；`URLSearchParams` 有值才拼 `?state=`（照 `:367-373` `comment list`）；`return api.request("GET", \`/api/inbox${query}\`)`。
  - `inbox mark`：`expectOperandCount(parsed, 1)`；`const state = requiredOption(parsed.options, "state")`（`:1034`，缺失即 usageError 含 `--state`）；不在 `["read", "unread", "archived"]` → `throw usageError("--state must be read, unread, or archived")`；`return api.request("PATCH", \`/api/inbox/${encodeURIComponent(parsed.operands[0])}\`, { state })`（空 id 走 `usageError("Missing inbox item id")`，照 `:1078` `taskPath` 的形状写一个 `inboxItemPath`）。
  - `inbox read-all`：`expectOperandCount(parsed, 0)`；`return api.request("POST", "/api/inbox/read-all")`（第三参不传，`api.request` 就不带 body 与 content-type，服务端 `assertEmptyRequestBody` 才过）。
- **不需要**改 `parseArgs`（`:206`，`inbox` 作为 resource、`list|mark|read-all` 作为 action 自然解析）、`createApiClient`（`:445`）、`normalizeError`。
- **测试** `test/cli.test.mjs`：沿用 `run(argv, fetch, overrides)` `:24`（默认 env 带 `TASKBOARD_THREAD_ID`；归属用例传 `{ env: {} }` 覆盖）、`response(payload, status)` `:17`；正例样板 `:564` `comment list and add …`（断言 `calls[i].url.pathname` / `init.method` / `JSON.parse(init.body)`），负例样板 `:703`（fetch 里 `assert.fail`，断言 `exitCode` 2 与 `stderr.error.code`）。**只许新建用例，不改既有 32 条。**

## 你要做的 6 件（= 议题验收 ①–⑥）

**① 表 + 帮助 + 消息**：三个命令各在选项表与 switch 出现恰 1 次；`/api/inbox` 字面 ≥ 3 处；「Expected one of」含 `inbox list/mark/read-all`；根帮助三行；`"thread-id"` 字面计数与基线相同。
**② 校验先于请求**：五种用法错误（议题②）都在调 `api.request` 之前抛 `usageError`。
**③ 六个新用例**（标题逐字含议题③的六个串）：
- `inbox list forwards --state`：两次调用，无 `--state` → `pathname` `/api/inbox` 且 `url.search` 为空；`--state all` → `url.searchParams.get("state")` = `all`；`init.method` GET；`init.headers["x-taskboard-client"]` = `taskctl`；stdout 原样透传 `{ items, unreadCount }` + `schemaVersion: 2`。
- `inbox list rejects an invalid --state`：`--state foo` → exit 2、`USAGE_ERROR`、`/unread/` 与 `/all/` 都匹配消息；fetch `assert.fail`。
- `inbox mark patches the item state`：id 用 `item/1` → `pathname` = `/api/inbox/item%2F1`、`init.method` PATCH、body `{ state: "archived" }`。
- `inbox mark requires a valid --state`：无 `--state` → exit 2 消息 `/--state/`；`--state gone` → exit 2 消息 `/archived/`；两次 fetch 都 `assert.fail`。
- `inbox read-all posts without a body`：`pathname` `/api/inbox/read-all`、POST、`init.body` === undefined、`init.headers["content-type"]` === undefined。
- `inbox commands do not require conversation attribution`：`{ env: {} }` 下 `inbox list` / `inbox mark x --state read` / `inbox read-all` 三个 exit 0。
**④ 冒烟**：下节全段贴 report。
**⑤ 回归**：`npm run check` e=0，node ≥ 141 / fail 0，vitest ≥ 13；不删既有用例；pathspec 外零 diff；活库副本段。
**⑥ 审查**：不归你；report 头行 PASS / FAIL / BLOCKED 真实。

## 冒烟（端口 47999，临时 DATA_DIR；逐字跑，全段贴 report）

```
D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; export TASKBOARD_URL=http://127.0.0.1:47999; U=$TASKBOARD_URL; A='x-taskboard-client: taskctl'; J='content-type: application/json'; T="node cli/taskctl.mjs"
# 1 agent 建任务并 move → in_review（#11 路径）
R=$(curl -s -X POST $U/api/tasks -H "$A" -H "$J" -d '{"projectId":"local","title":"inbox cli 冒烟","threadId":"smoke"}'); TID=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["id"])'); echo "$TID"
$T issue move "$TID" --status in_review --thread-id smoke --json > $D/mv.json; echo "move e=$?"
# 2 list → 1
$T inbox list --json > $D/l1.json; echo "list e=$?"; cat $D/l1.json; echo      # unreadCount 1，items[0].kind status_changed
IID=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["items"][0]["id"])' $D/l1.json)
# 3 mark read → readAt 非 null；list → 0；all → 1
$T inbox mark "$IID" --state read --json | python3 -c 'import json,sys;d=json.load(sys.stdin);print("readAt", d["item"]["readAt"] is not None, "schema", d["schemaVersion"])'   # True 2
$T inbox list --json | python3 -c 'import json,sys;print("unread", json.load(sys.stdin)["unreadCount"])'                 # 0
$T inbox list --state all --json | python3 -c 'import json,sys;print("all", len(json.load(sys.stdin)["items"]))'      # 1
# 4 agent 评论 → 1；read-all → updated 1；list → 0
curl -s -X POST $U/api/tasks/$TID/comments -H "$A" -H "$J" -d '{"body":"冒烟评论","threadId":"smoke"}' > /dev/null
$T inbox list --json | python3 -c 'import json,sys;print("unread", json.load(sys.stdin)["unreadCount"])'                 # 1
$T inbox read-all --json; echo                                                                                            # {"updated":1,"schemaVersion":2}
$T inbox list --json | python3 -c 'import json,sys;print("unread", json.load(sys.stdin)["unreadCount"])'                 # 0
# 5 错误合约
$T inbox mark nope --state read --json > $D/e1.out 2> $D/e1.err; echo "404 e=$?"; cat $D/e1.err; echo                    # e 非 0；error.code INBOX_ITEM_NOT_FOUND
$T inbox list --state foo --json > $D/e2.out 2> $D/e2.err; echo "usage e=$?"; cat $D/e2.err; echo                        # e=2；USAGE_ERROR，消息含 unread / all
$T inbox mark x > $D/e3.out 2> $D/e3.err; echo "nostate e=$?"; cat $D/e3.err; echo                                        # e=2；消息含 --state
$T inbox list extra > $D/e4.out 2> $D/e4.err; echo "operand e=$?"                                                        # e=2
$T --help | grep -F '  inbox '                                                                                           # 3 行
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); unset TASKBOARD_URL; echo "smoke done"
```

活库副本（协调席派任务时给目录 `<LIVE>`，里面是 `taskboard.sqlite` 的副本；**不许碰主仓 `.data/`**）：
```
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=<LIVE> node server/index.mjs > /tmp/live.log 2>&1 &
sleep 2; curl -s http://127.0.0.1:47998/health; echo
TASKBOARD_URL=http://127.0.0.1:47998 node cli/taskctl.mjs inbox list --json > /tmp/live-inbox.json; echo "live e=$?"; grep -c -F '"unreadCount"' /tmp/live-inbox.json   # e=0 / 1
kill $(lsof -tiTCP:47998 -sTCP:LISTEN)
```

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# tests` ≥ 141 `# fail 0`；vitest `Tests N passed` N ≥ 13 |
| `cli/**` | 冒烟全段 + 活库副本段；`node cli/taskctl.mjs --help` 全文贴一次 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- `test/cli.test.mjs` 既有 32 条不删不改（`git diff $base..HEAD -- test/ | grep -cE '^-\s*(test|it)\('` = 0）；`issue and comment writes require conversation attribution` 仍绿（inbox 例外不许波及 issue / comment）。
- 既有命令的选项表、帮助文本、错误消息一字不改（`git diff $base..HEAD -- cli/taskctl.mjs | grep -E '^-' | grep -vE '^---' | wc -l` 取值贴 report，预期 ≤ 2：只有「Expected one of」一行与帮助文本一处被改写）。
- `api.request` / `parseArgs` / `normalizeError` / `createApiClient` 不动。

## 验收口径

议题 ①–⑥ 逐条，判据命令逐字跑并贴取值；审查席会重跑同一套。冒烟里每条「预期」都是判据。

## 提交纪律

- **恰一个 commit**：`git add -- cli/taskctl.mjs test/cli.test.mjs` → `git commit -m "feat(taskctl): inbox list/mark/read-all subcommands over /api/inbox (#13)"`。commit 后 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 2。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec 两个文件；发现必须改别处才能做完 = BLOCKED 请示，不要自己扩范围。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`；冒烟结束 `unset TASKBOARD_URL`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d13-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "<csv>" --report-path /Users/happy/projects/taskboard/.scratch/d13-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–⑤ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 冒烟全段 + 活库副本段 + `--help` 全文 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（没核到的写这里）。
