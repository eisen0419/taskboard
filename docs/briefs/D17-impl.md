# D17 · 收件箱按项目过滤：`GET /api/inbox?projectId=` + Web 跟当前项目 + `taskctl inbox list --project`（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/17>（`gh issue view 17 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」4 条。** 背景：#9 / #13 / #15 的实现（main `198b31a` / `cd1bd28` / `39910dc`）。

席位：`codex-sol`。分支：`spec/17`，**baseSha = `19d371e`**（taskboard main，写单时 HEAD；行号取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：`server/app.mjs`、`server/database.mjs`、`test/inbox.test.mjs`、`test/cli.test.mjs`、`cli/taskctl.mjs`、`web/src/api.ts`、`web/src/App.tsx`。**其余一律不动**：`web/src/components/**`、`web/src/types.ts`、`web/src/styles.css`、`shared/**`、`scripts/**`、`docs/**`、`README*`、`package.json`、`package-lock.json`、`AGENTS.md`、`CLAUDE.md`、`.teams-orca*.json`、`dist/**`。

## 先装依赖

`npm install > /tmp/npm-d17.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，**不要软链主仓**）。

## 基线取值（协调席已在 19d371e 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                                   # e=0；# tests 147 # pass 147 # fail 0；vitest「Tests 14 passed」
grep -c -F 'new Set(["state", "projectId"])' server/app.mjs                  # 0
grep -c -F 'PROJECT_NOT_FOUND' server/app.mjs                                # 取值记下，交付后 +1
grep -cE '^test\(' test/inbox.test.mjs                                        # 20
grep -cE '^test\(' test/cli.test.mjs                                          # 38
node cli/taskctl.mjs --help | grep -c -F '[--project PROJECT_ID]'             # 0
```

## 扩展点（行号取自 19d371e，以内容为准）

- **路由** `server/app.mjs:1301-1310`：`assertAllowedQuery(url.searchParams, new Set(["state", "projectId"]), "GET /api/inbox")`（逐字，判据 grep）；`const projectId = url.searchParams.get("projectId") ?? undefined;`；`projectId === ""` → `throw new ApiError(400, "INVALID_FIELD", "'projectId' must not be empty")`；`projectId !== undefined` 且项目不存在 → 照 `:1285` 抛 `ApiError(404, "PROJECT_NOT_FOUND", …)`（用同一个查项目的 database 方法，看 `:1285` 上下文取名）；`return sendJson(response, 200, database.listInbox(state, projectId));`（逐字）。
- **数据层** `server/database.mjs:1928` `listInbox(state = "unread", projectId = undefined)`：把两条 SQL 的 WHERE 改成条件数组拼接（照 `:1240` `listTasks` 的 `conditions` / `values` 写法），`projectId` 给了就各推一条 `inbox_items.project_id = ?`（逐字，判据 awk+grep 在函数体内数到 2）；`state === "unread"` 仍是 `read_at IS NULL AND archived_at IS NULL`；`ORDER BY` / `LIMIT 200` 不动；`unreadCount` 的 COUNT 也要按 projectId 过滤。折叠逻辑（`#createInboxItem`）不碰。
- **Web api** `web/src/api.ts:129`：`listInbox(state: "unread" | "all" = "unread", projectId?: string)`，用 `URLSearchParams` 拼 `state` 与（有值时）`projectId`。
- **Web App** `web/src/App.tsx:1032` `refreshInbox`：`const projectId = selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID ? selectedProjectId : undefined; const inbox = await listInbox("unread", projectId);`，deps 改 `[selectedProjectId]`。`:1042` 的 effect deps 已是 `[refreshInbox]`，切项目自然重跑。`:354` SSE 分支不动（事件来了就按当前项目重取）。`markInboxRead` / `archiveInboxItem` / `markAllInboxRead`（`:750-775`）不动。**不动 `InboxView` 与任何 `components/`。**
- **CLI** `cli/taskctl.mjs:114`：`["inbox list", new Set(["state", "project", "json"])]`（逐字）；`:137` 根帮助行改为 `  inbox list [--state unread|all] [--project PROJECT_ID]`（逐字）；`:440-450` case：照 `:752` `search.set("projectId", options.project)` 加一行（`parsed.options.project !== undefined` 时）。`inbox mark` / `read-all` 不动。
- **服务端测试** `test/inbox.test.mjs`：加 helper `createProject(baseUrl, id, name)`（`POST /api/projects` body `{ id, name }`，照 `server/app.mjs:357` `parseProjectCreate` 的键）与 `createTaskIn(baseUrl, projectId, title)`（`POST /api/tasks` body `{ projectId, title }`）；既有 `createTask` `:48` 不动。四个新用例标题逐字含议题③的四个串。**只许新建用例，不改既有 20 条。**
- **CLI 测试** `test/cli.test.mjs`：照 `:213` `issue list serializes project and status filters` 的写法加 `inbox list forwards --project`（断言 `url.searchParams.get("projectId")` = 传入值、`pathname` = `/api/inbox`、GET）。既有 38 条不动。

## 你要做的 6 件（= 议题验收 ①–⑥）

**① 路由**：三个逐字串；未知项目 404、空串 400；不带 `projectId` 行为与形状不变。
**② 数据层**：函数体内 `inbox_items.project_id = ?` 恰 2 处；折叠代码零 diff。
**③ 五个新用例**（四个 inbox + 一个 cli，标题逐字）：
- `project filter: scopes items and unreadCount`：建项目 `beta`；local 任务 A agent PATCH `in_review`、beta 任务 B agent PATCH `blocked`；`?projectId=local` → items 1、`items[0].taskId` = A、`unreadCount` 1；`?projectId=beta` → B、1；`?projectId=beta&state=all` 也是 1。
- `project filter: omitted projectId keeps the global view`：同上造数后不带参数 → items 2、`unreadCount` 2、键顺序仍 `["items","unreadCount"]`。
- `project filter: unknown project returns 404`：`?projectId=nope` → 404 `PROJECT_NOT_FOUND`；`?projectId=` → 400 `INVALID_FIELD`。
- `project filter: read-all stays global`：两项目各 1 条未读后 `POST /api/inbox/read-all` → `{ updated: 2 }`，之后 `?projectId=local` 与 `?projectId=beta` 的 `unreadCount` 都 0。
- `inbox list forwards --project`（cli.test）：`["inbox", "list", "--project", "beta"]` → `url.pathname` `/api/inbox`、`searchParams.get("projectId")` = `beta`；与 `--state all` 同给时两个参数都在。
**④ Web + CLI**：api.ts / App.tsx / 选项表 / 帮助行按扩展点；`components/` 零 diff；typecheck e=0。
**⑤ 冒烟 + 活库**：下节全段贴 report。
**⑥ 回归**：`npm run check` e=0，node ≥ 152 / fail 0，vitest ≥ 14；不删既有用例；pathspec 外零 diff。

## 冒烟（端口 47999，临时 DATA_DIR；逐字跑，全段贴 report）

```
D=$(mktemp -d); npm run build > $D/build.log 2>&1; echo "build e=$?"
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; export TASKBOARD_URL=http://127.0.0.1:47999; U=$TASKBOARD_URL; A='x-taskboard-client: taskctl'; J='content-type: application/json'
T() { node cli/taskctl.mjs "$@"; }
Q() { curl -s "$U/api/inbox$1" | python3 -c 'import json,sys;d=json.load(sys.stdin);print("unread",d.get("unreadCount"),"rows",len(d.get("items",[])),*[i["taskId"][:8] for i in d.get("items",[])])'; }
# 1 建项目 beta；local 任务 A → in_review；beta 任务 B → blocked
curl -s -X POST $U/api/projects -H "$J" -d '{"id":"beta","name":"Beta"}' -o /dev/null -w 'project %{http_code}\n'
R=$(curl -s -X POST $U/api/tasks -H "$A" -H "$J" -d '{"projectId":"local","title":"过滤 A","threadId":"smoke"}'); TA=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["id"])'); echo "A=${TA:0:8}"
T issue move "$TA" --status in_review --thread-id smoke --json > /dev/null; echo "moveA e=$?"
R=$(curl -s -X POST $U/api/tasks -H "$A" -H "$J" -d '{"projectId":"beta","title":"过滤 B","threadId":"smoke"}'); TB=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["id"])'); echo "B=${TB:0:8}"
T issue move "$TB" --status blocked --thread-id smoke --json > /dev/null; echo "moveB e=$?"
# 2 读：全局 2；local 1 = A；beta 1 = B
echo "global: $(Q '')"; echo "local: $(Q '?projectId=local')"; echo "beta: $(Q '?projectId=beta')"; echo "beta+all: $(Q '?projectId=beta&state=all')"
# 3 错误合约
curl -s -o /dev/null -w 'nope %{http_code}\n' "$U/api/inbox?projectId=nope"; curl -s "$U/api/inbox?projectId=nope" | python3 -c 'import json,sys;print(json.load(sys.stdin)["error"]["code"])'      # 404 PROJECT_NOT_FOUND
curl -s -o /dev/null -w 'empty %{http_code}\n' "$U/api/inbox?projectId="                                                                                                       # 400
curl -s -o /dev/null -w 'foo %{http_code}\n' "$U/api/inbox?foo=1"                                                                                                              # 400
# 4 CLI
T inbox list --project beta --json | python3 -c 'import json,sys;d=json.load(sys.stdin);print("cli beta unread",d["unreadCount"],"rows",len(d["items"]))'                       # 1 1
T inbox list --project nope --json > /dev/null 2> $D/e1.err; echo "cli nope e=$? $(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["error"]["code"])' $D/e1.err)"   # 非 0 PROJECT_NOT_FOUND
T --help | grep -F 'inbox list'                                                                                                                                                # 含 [--project PROJECT_ID]
# 5 read-all 全局
T inbox read-all --json; echo                                                                                                                                                  # {"updated":2,...}
echo "local after: $(Q '?projectId=local')"; echo "beta after: $(Q '?projectId=beta')"                                                                                         # 0 / 0
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); unset TASKBOARD_URL; echo "smoke done"
```

活库副本（协调席派任务时给目录 `<LIVE>`；**不许碰主仓 `.data/`**）：
```
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=<LIVE> node server/index.mjs > /tmp/live.log 2>&1 &
sleep 2; curl -s http://127.0.0.1:47998/health; echo
python3 - <<'EOF'
import json, urllib.request
U = "http://127.0.0.1:47998"
g = json.load(urllib.request.urlopen(U + "/api/inbox"))["unreadCount"]
ids = [p["id"] for p in json.load(urllib.request.urlopen(U + "/api/projects"))["projects"]]
per = {i: json.load(urllib.request.urlopen(U + "/api/inbox?projectId=" + i))["unreadCount"] for i in ids}
print("global", g, "per", per, "sum==global", sum(per.values()) == g)
EOF
kill $(lsof -tiTCP:47998 -sTCP:LISTEN)
```

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# tests` ≥ 152 `# fail 0`；vitest `Tests N passed` N ≥ 14 |
| `server/**` / `cli/**` | 冒烟 5 步全段 + 活库段 |
| `web/**` | `npm run typecheck` e=0；`dist/web/index.html` 存在（build 后）；`git diff $base..HEAD --stat -- web/src/components/ web/src/types.ts web/src/styles.css \| wc -l` = 0 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- `test/**` 既有用例不删不改（`git diff $base..HEAD -- test/ | grep -cE '^-\s*(test|it)\('` = 0；`test/inbox.test.mjs` 与 `test/cli.test.mjs` 删除行各 0）。
- 不带 `projectId` 的 `GET /api/inbox` 形状、顺序、`LIMIT 200`、`unreadCount` 语义不变；PATCH / read-all 不变；17 个事件名与 payload 不变；折叠逻辑零 diff。
- `taskctl inbox mark` / `read-all`、`issue *` 命令合约不变；`--help` 只改 `inbox list` 那一行。

## 验收口径

议题 ①–⑥ 逐条，判据命令逐字跑并贴取值；审查席会重跑同一套。冒烟里每条「预期」都是判据。

## 提交纪律

- **恰一个 commit**：`git add -- server/app.mjs server/database.mjs test/inbox.test.mjs test/cli.test.mjs cli/taskctl.mjs web/src/api.ts web/src/App.tsx` → `git commit -m "feat(inbox): filter inbox by projectId across API, web and taskctl (#17)"`。commit 后 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` ≤ 7 且每行路径在 pathspec 内。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec；发现必须改别处才能做完 = BLOCKED 请示，不要自己扩范围。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`；冒烟结束 `unset TASKBOARD_URL`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`；shell 函数可以，**别把命令存进变量再 `$VAR` 展开**（zsh 不分词）；**`python3 -c` 单行里别用带嵌套引号的 f-string**（本机 SyntaxError，用 `.format` 或多行 heredoc）。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d17-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "<csv>" --report-path /Users/happy/projects/taskboard/.scratch/d17-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–⑥ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 冒烟 5 步 + 活库段原文 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（没核到的写这里）。
