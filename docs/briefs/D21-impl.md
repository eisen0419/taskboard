# D21 · 活动时间线取最新 N 条：`GET /api/tasks/:id/activities?limit=` + `hasMore`（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/21>（`gh issue view 21 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」4 条。** 背景：D5 F3（`docs/research/D5/multica-reference.md`，multica `activity.sql:18` 的双重排序子查询）。

席位：`codex-sol`。分支：`spec/21`，**baseSha = `61f4e40`**（taskboard main，写单时 HEAD；行号取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：`server/database.mjs`、`server/app.mjs`、`test/task-activities.test.mjs`（新建）、`test/pr-review-regressions.test.mjs`（**只许改一个标记字符串**）、`web/src/api.ts`、`web/src/components/TaskDetail.tsx`、`web/src/styles.css`。**其余一律不动**：`web/src/App.tsx`、`web/src/types.ts`、其他 `components/*`、`cli/**`、`shared/**`、`scripts/**`、`docs/**`、`README*`、`package.json`、`package-lock.json`、`AGENTS.md`、`CLAUDE.md`、`.teams-orca*.json`、`dist/**`。

## 先装依赖

`npm install > /tmp/npm-d21.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，**不要软链主仓**）。

## 基线取值（协调席已在 61f4e40 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                                                        # e=0；# tests 152 # pass 152 # fail 0；vitest「Tests 20 passed」
awk '/^  listTaskActivities\(/,/^  }/' server/database.mjs | grep -c 'LIMIT ?'                      # 0
grep -c -F 'Activity routes do not accept query parameters' server/app.mjs                        # 1（交付后 0）
grep -c -F 'hasMore' server/app.mjs web/src/api.ts web/src/components/TaskDetail.tsx               # 各 0
ls test/task-activities.test.mjs 2>&1 | grep -c 'No such'                                          # 1
grep -c -F '"  listTaskActivities(taskId)"' test/pr-review-regressions.test.mjs                    # 1
```

## 扩展点（行号取自 61f4e40，以内容为准）

- **数据层** `server/database.mjs:1919` `listTaskActivities(taskId)` → `listTaskActivities(taskId, limit = 100)`：
  ```js
  const task = this.#requireTask(taskId);
  const activities = this.database.prepare(`
    SELECT * FROM (
      SELECT * FROM task_activities
      WHERE task_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    )
    ORDER BY created_at, id
  `).all(task.id, limit).map(taskActivityFromRow);
  const total = this.database.prepare(`
    SELECT COUNT(*) AS count FROM task_activities WHERE task_id = ?
  `).get(task.id).count;
  return { activities, hasMore: total > limit };
  ```
  （内层 `SELECT * FROM task_activities` 与 `.map(taskActivityFromRow)` 两个字面必须保留：`test/pr-review-regressions.test.mjs:41-42` 用正则在方法体上断言它们。）`#activitiesForTasks` 不动。
- **路由** `server/app.mjs:1442-1461`：把 `if ([...url.searchParams.keys()].length > 0) { throw … "Activity routes do not accept query parameters" }` 换成 `assertAllowedQuery(url.searchParams, new Set(["limit"]), "GET /api/tasks/:id/activities")`（逐字 `new Set(["limit"])`），再解析：`const rawLimit = url.searchParams.get("limit"); const limit = rawLimit === null ? 100 : Number(rawLimit); if (rawLimit !== null && (!/^\d+$/.test(rawLimit) || !Number.isSafeInteger(limit) || limit < 1 || limit > 500)) { throw new ApiError(400, "INVALID_FIELD", "'limit' must be an integer from 1 to 500"); }`（照 `:791` `parseTaskTreeQuery` 的 depth 写法；消息逐字）；GET 分支 `const { activities, hasMore } = database.listTaskActivities(taskId, limit); return sendJson(response, 200, { activities, hasMore });`。405 分支不动。
- **源码文本测试** `test/pr-review-regressions.test.mjs:29`：`"  listTaskActivities(taskId)"` → `"  listTaskActivities(taskId, "`（只改这一个字符串字面，其余一字不动；改完这条测试必须仍绿）。
- **Web api** `web/src/api.ts:396-405`：`listTaskActivities(taskId, signal?, limit?)` 返回 `Promise<{ activities: TaskChangeActivity[]; hasMore: boolean }>`；有 `limit` 才拼 `?limit=`；`request<{ activities; hasMore }>`。
- **TaskDetail** `web/src/components/TaskDetail.tsx`：`:375` 旁加 `const [activitiesTruncated, setActivitiesTruncated] = useState(false);`；`:466-482` effect 里 `setTaskActivities(nextActivities.activities); setActivitiesTruncated(nextActivities.hasMore);`；渲染：`:1183` 创建条目之后、变更条目 map 之前加 `{activitiesTruncated && <p className="activity-truncated">{text("仅显示最近 100 条活动", "Showing the latest 100 activities")}</p>}`（两个字面逐字，判据 grep）。`activityTimeline.length` 计数不动。样式 `.activity-truncated` 加在 `styles.css` 活动流那段（次要文字色、小字号）。
- **新测试** `test/task-activities.test.mjs`：helper 照 `test/inbox.test.mjs:20-56`（`startServer` / `request` / `createTask`；agent 头 `x-taskboard-client: taskctl`）。造活动 = agent PATCH `/api/tasks/:id` 改 `title`（带 `version`）。六个用例标题逐字含议题③的六个串；`default limit is 100` 那条循环 101 次 PATCH（读回 `task.version` 递增），断言 `activities.length` 100、`hasMore` true、`activities[0].changes[0].after` = 第 2 次的标题。

## 你要做的 6 件（= 议题验收 ①–⑥）

**① 数据层**：子查询 + COUNT，七个 grep 判据；`#activitiesForTasks` 零 diff。
**② 路由**：白名单 + 范围校验 + `hasMore`；旧消息字面 0。
**③ 六个用例 + 标记一行**：见扩展点；`pr-review-regressions` 删除行恰 1。
**④ Web**：api 返回形状、TaskDetail 提示行、样式、typecheck。
**⑤ 冒烟 + 活库**：下节全段贴 report。
**⑥ 回归**：`npm run check` e=0，node ≥ 158 / fail 0，vitest 20 不变；pathspec 外零 diff。

## 冒烟（端口 47999，临时 DATA_DIR；逐字跑，全段贴 report）

```
D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; U=http://127.0.0.1:47999; A='x-taskboard-client: taskctl'; J='content-type: application/json'
G() { curl -s "$U/api/tasks/$TID/activities$1" | python3 -c 'import json,sys;d=json.load(sys.stdin);a=d.get("activities");print("n",len(a) if a is not None else None,"hasMore",d.get("hasMore"),"afters",[x["changes"][0]["after"] for x in (a or [])] if a is not None else d.get("error",{}).get("code"))'; }
# 1 建任务，agent 连改 5 次标题
R=$(curl -s -X POST $U/api/tasks -H "$A" -H "$J" -d '{"projectId":"local","title":"活动 0","threadId":"smoke"}'); TID=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["id"])'); V=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])')
for i in 1 2 3 4 5; do R=$(curl -s -X PATCH $U/api/tasks/$TID -H "$A" -H "$J" -d "{\"version\":$V,\"title\":\"活动 $i\",\"threadId\":\"smoke\"}"); V=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["version"])'); done; echo "patched to v$V"
# 2 默认 → 5 条升序 hasMore false；limit=2 → 活动 4 / 活动 5，hasMore true
echo "default: $(G '')"; echo "limit=2: $(G '?limit=2')"; echo "limit=500: $(G '?limit=500')"
# 3 错误合约
for q in '?limit=0' '?limit=abc' '?limit=501' '?foo=1' '?limit=2&limit=3'; do printf '%s -> %s %s\n' "$q" "$(curl -s -o /dev/null -w '%{http_code}' "$U/api/tasks/$TID/activities$q")" "$(curl -s "$U/api/tasks/$TID/activities$q" | python3 -c 'import json,sys;print(json.load(sys.stdin)["error"]["code"])')"; done   # 400 INVALID_FIELD ×3 / UNKNOWN_QUERY_PARAMETER / INVALID_QUERY_PARAMETER
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); echo "smoke done"
```

活库副本（协调席派任务时给目录 `<LIVE>`；**不许碰主仓 `.data/`**）：
```
TID=$(sqlite3 <LIVE>/taskboard.sqlite "select task_id from task_activities group by task_id order by count(*) desc limit 1"); N=$(sqlite3 <LIVE>/taskboard.sqlite "select count(*) from task_activities where task_id='$TID'"); echo "$TID $N"
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=<LIVE> node server/index.mjs > /tmp/live.log 2>&1 &
sleep 2; U=http://127.0.0.1:47998; echo "default: $(G '')"; echo "limit=3: $(G '?limit=3')"     # n=N hasMore false；n=3 hasMore true
kill $(lsof -tiTCP:47998 -sTCP:LISTEN)
```

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# tests` ≥ 158 `# fail 0`；vitest `Tests 20 passed` |
| `server/**` | 冒烟 3 步全段 + 活库段 |
| `web/**` | `npm run typecheck` e=0；`git diff $base..HEAD --stat -- web/src/App.tsx web/src/types.ts \| wc -l` = 0 |
| `test/pr-review-regressions.test.mjs` | `git diff $base..HEAD -- test/pr-review-regressions.test.mjs \| grep -E '^-' \| grep -vE '^---'` 恰 1 行且含 `listTaskActivities(taskId)`；`node --test test/pr-review-regressions.test.mjs > /tmp/prr.log 2>&1; e=$?` → 0 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- 既有 152 条服务端用例与 20 条组件用例不删不改（`pr-review-regressions` 只动那一个标记字符串）。
- 默认调用（不带 `limit`）在活动 ≤ 100 时返回的 `activities` 内容与顺序与改前逐条相同；`{ activities }` 键仍在，只多 `hasMore`。
- `#activitiesForTasks`、`#recordTaskActivity`、其他路由、事件名与 payload 不变。

## 验收口径

议题 ①–⑥ 逐条，判据命令逐字跑并贴取值；审查席会重跑同一套。冒烟里每条「预期」都是判据。

## 提交纪律

- **恰一个 commit**：`git add -- server/database.mjs server/app.mjs test/task-activities.test.mjs test/pr-review-regressions.test.mjs web/src/api.ts web/src/components/TaskDetail.tsx web/src/styles.css` → `git commit -m "feat(activities): cap task activity timeline to the latest N with limit and hasMore (#21)"`。commit 后 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` ≤ 7 且每行路径在 pathspec 内。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec；发现必须改别处才能做完 = BLOCKED 请示，不要自己扩范围。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`；shell 函数可以，别把命令存进变量再 `$VAR` 展开（zsh 不分词）；`python3 -c` 单行别用嵌套引号 f-string。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d21-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "<csv>" --report-path /Users/happy/projects/taskboard/.scratch/d21-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–⑥ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 冒烟 3 步 + 活库段原文 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（没核到的写这里）。
