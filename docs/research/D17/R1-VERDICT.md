PASS
reviewedHead: 575f7af28028b505ef9e037e860c87ddfb1c64ff
fixedPoint: 58f205e83a03e0b9cefda5204d0ba2fdcb82f8fb
diffCommand: git diff 58f205e83a03e0b9cefda5204d0ba2fdcb82f8fb..575f7af28028b505ef9e037e860c87ddfb1c64ff
commits: 575f7af feat(inbox): filter inbox by projectId across API, web and taskctl (#17)
implReport: /Users/happy/projects/taskboard/.scratch/d17-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/17 （验收 6 + Out of scope 4；comments 空）
conclusion: 逐条核过（①–⑤ 命令与取值均为本席亲跑，端口 47998；⑥ 为本席 VERDICT；补充打点 1–6 亲跑；逃避清单对 `58f205e..575f7af` 机械核；未改交付物、未 push；活库只用 `.scratch/d17-native/live-review`，未碰 `live/` 与主仓 `.data/`）

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 4 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

Standards 轴 1 条硬违反（impl report ① `pathname === "/api/inbox"` 未 `-F`，§3；本席 `grep -c -F` 同 1）+ 1 条判断级（`listInbox` 两段 `project_id = ?` 绑定重复）；Spec 轴 0 条 finding。不选总赢家。

## Standards 轴

汇总：`listInbox` 用 `conditions`/`values` 拼 `?` 占位，与 `listTasks` 同形；`unreadCount` 同样绑定 `project_id = ?`（未读谓词常驻 COUNT，与 `state=all` 的 items 不可共用同一数组）；路由层项目存在性复用 `:1285` 的 `database.getProject`；App.tsx 只改 `refreshInbox` 及其 deps；CLI 照 `listIssues` 的 `search.set("projectId", …)`。report 退出码无管道。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d17r.log 2>&1; e=$?` → **0**；`npm run check > /tmp/check-d17r.log 2>&1; e=$?` → **0**，`ℹ tests 152` / `ℹ pass 152` / `ℹ fail 0`，vitest `Tests  14 passed (14)`，与 report 一致。新哨兵/变异：不适用。 |
| §3 本机工具陷阱 | 违反（report ① 一处字面无 `-F`）；本席重跑符合 | report ① `grep -c 'pathname === "/api/inbox"'` 未 `-F`（议题原文即此针；ugrep 下无 `$`，计数仍可信）。本席 `grep -c -F` 与无 `-F` 均 **1**（`server/app.mjs:1302`）。其余 `grep -c -F` / `grep -cE '^test\('`。awk 用区间正则非 `==`。无 `ps \| grep` / `pgrep -f`。冒烟 `python3 -c` 无嵌套引号 f-string。 |
| §6 测试与断言 | 符合 | 四条 inbox 经 `startServer` → `createTaskboardServer` 真 HTTP（`test/inbox.test.mjs:21-27` / `request` `:30-46` / 用例 `:111-184`）；期望为字面量（`items.length` 1/2、`unreadCount` 1/2、`nope`/`PROJECT_NOT_FOUND`/`INVALID_FIELD`、`{ updated: 2 }`）。CLI `inbox list forwards --project` mock fetch 是既有约定。无新增 `.skip(` / `.only(`。未 mock `database` / `EventHub`。 |
| listInbox conditions/values | 符合 | `server/database.mjs:1928-1961`：`conditions`/`values` + `join(" AND ")`，`projectId` 走 `?`（`:1935-1936`）。`awk '/^  listInbox\(/,/^  }/' server/database.mjs \| grep -c -F 'inbox_items.project_id = ?'` → **2**。无把 projectId 拼进 SQL 字符串。 |
| unreadCount 同条件 | 符合 | COUNT 同样 `inbox_items.project_id = ?` + bind（`:1952-1960`）。未读谓词常驻 COUNT；items 仅 `state==="unread"` 才加（`:1931-1933`）——`state=all` 时不可共用同一数组。补充打点 2 亲跑：beta 1 已读 + 1 未读 → items **2**、`unreadCount` **1**。 |
| getProject 复用 | 符合 | `:1285` 路径 `database.getProject(projectId)`（`app.mjs:1284-1285`）；inbox `app.mjs:1313-1314` 同一方法。本席 `grep -c -F 'database.getProject(projectId)'` → **2**。错误码与文案同形 `PROJECT_NOT_FOUND` / `Project '${projectId}' does not exist`。 |
| App.tsx 范围 | 符合 | two-dot 只改 `refreshInbox`：`selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID` 才传 `projectId`，deps `[selectedProjectId]`（`:1032-1043`）。随后 effect 仍 `[refreshInbox]`（`:1045-1047`）；SSE `:354-356` 仍 `void refreshInbox()` 且已在 effect deps 含 `refreshInbox`（`:417-428`）。`markInboxRead` / `archiveInboxItem` / `markAllInboxRead`（`:750-775`）零 diff。 |
| CLI search.set | 符合 | `cli/taskctl.mjs:446-448`：`URLSearchParams` + `parsed.options.project !== undefined` 时 `search.set("projectId", parsed.options.project)`，与 `listIssues` `:781` 同形。 |
| Fowler 味道 | 判断调用，非硬违反 | **Duplicated Code**（判断）：projectId 两段几乎同文（`:1934-1937` 与 `:1952-1955`）。COUNT 必须保留未读谓词，不能与 items 共用一组 `conditions`。Shotgun Surgery / Speculative Generality：不适用（允许的 7 文件、无额外抽象）。函数未过长。 |

Worst within Standards: report 字面 `grep` 未一律 `-F`（§3）。计数仍可信。两段 project 绑定重复不构成产品缺陷。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `58f205e..575f7af`（审查开始时实现 commit 恰 1）。任务书 baseSha `19d371e` 是写单时 main；实际 merge-base 是 briefs commit `58f205e`（含 D17 两单），two-dot 仍只有实现七文件。`git merge-base --is-ancestor 19d371e HEAD` e=0。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 路由 | 做到 | `grep -c -F 'new Set(["state", "projectId"])' server/app.mjs` → **1**。`grep -c -F 'PROJECT_NOT_FOUND' server/app.mjs` HEAD=**2**，`git show '58f205e83a03e0b9cefda5204d0ba2fdcb82f8fb:server/app.mjs' \| grep -c -F` → **1**（+1；位点 `:1285` 既有 + `:1314` 新增）。`grep -c -F 'database.listInbox(state, projectId)' server/app.mjs` → **1**。`grep -c 'pathname === "/api/inbox"'` 与 `grep -c -F` 均 **1**。47998 亲跑：`?projectId=nope` → **404** `PROJECT_NOT_FOUND`；`?projectId=` → **400** `INVALID_FIELD`（`"'projectId' must not be empty"`）；`?foo=1` → **400** `UNKNOWN_QUERY_PARAMETER`；不带 `projectId` 键序仍 `items, unreadCount`（冒烟 global unread 2 + 省略用例 `Object.keys` 字面 `["items","unreadCount"]`）。 |
| ② 数据层 | 做到 | `awk '/^  listInbox\(/,/^  }/' server/database.mjs \| grep -c -F 'inbox_items.project_id = ?'` → **2**（无 `-F` 同 2）。`grep -c -F 'collapsed_count' server/database.mjs` HEAD=**6**，base 同 **6**。`git diff … -- server/database.mjs \| grep -E 'createInboxItem\|collapsed'` 空。`ORDER BY inbox_items.created_at DESC, inbox_items.id DESC` 与 `LIMIT 200` 仍在。 |
| ③ 测试钉死 | 做到 | `grep -cE '^test\(' test/inbox.test.mjs` → **24**。四串各 `grep -c -F` → 各 **1**。`grep -cE '^test\(' test/cli.test.mjs` → **39**；`inbox list forwards --project` → **1**。`node --test test/inbox.test.mjs test/cli.test.mjs > /tmp/d17r-inbox-cli.log 2>&1; e=$?` → **0**，`ℹ tests 63` / `ℹ pass 63` / `ℹ fail 0`。前四条走真服务：`startServer` → `createTaskboardServer`；`POST /api/projects` 建 `beta`；`createTaskIn` + `agentStatus` 两项目各造一条；404 用例请求 `?projectId=nope`（不存在的 id）与 `?projectId=`。CLI 用例 mock fetch 断言 `searchParams.get("projectId")=="beta"`，与 `--state all` 同给时 `state` 也在。既有 20/38 标题仍在；`git diff … -- test/inbox.test.mjs \| grep -c '^-[^-]'` → **0**（cli 同 0）。 |
| ④ Web + CLI | 做到 | `awk '/export async function listInbox/,/^}/' web/src/api.ts \| grep -c -F 'projectId'` → **2**。`awk '/const refreshInbox = useCallback/,/\}, \[/' web/src/App.tsx \| grep -c -F 'selectedProjectId'` → **3**（用到 + deps；≥2）。`git diff 58f205e..HEAD --stat -- web/src/components/ \| wc -l` → **0**。`grep -c -F '["inbox list", new Set(["state", "project", "json"])]' cli/taskctl.mjs` → **1**。`node cli/taskctl.mjs --help \| grep -c -F 'inbox list [--state unread\|all] [--project PROJECT_ID]'` → **1**。`npm run typecheck > /tmp/d17r-typecheck.log 2>&1; e=$?` → **0**。`ALL_PROJECTS_ID`（`:190` `__all_projects__`）走 `undefined` 即全局。 |
| ⑤ 冒烟 + 活库 | 做到 | 5 步改端口 **47998**、`TASKBOARD_URL=http://127.0.0.1:47998`、临时 `DATA_DIR`。`npm run build` e=**0**。任务 A `f4d4bc28` / B `09e17557`：project **201**；moveA/moveB e=**0**；`global: unread 2 rows 2 09e17557 f4d4bc28`；`local: unread 1 rows 1 f4d4bc28`；`beta: unread 1 rows 1 09e17557`；`beta+all: unread 1 rows 1 09e17557`；`nope 404` / `PROJECT_NOT_FOUND`；`empty 400`；`foo 400`；`cli beta unread 1 rows 1`；`cli nope e=4 PROJECT_NOT_FOUND`；帮助行含 `[--project PROJECT_ID]`；`{"updated":2,"schemaVersion":2}`；`local after` / `beta after` unread 0 rows 0。活库专用副本 `/Users/happy/projects/taskboard/.scratch/d17-native/live-review`（未用实现席 `live/`、未碰主仓 `.data/`）：`TASKBOARD_PORT=47998` `/health` `{"status":"ok"}`；`global 13 per {'local': 0, 'orca-lab': 0, 'ziping': 4, 'field': 3, 'taskboard': 6} sum==global True`。47823 pid **8847** 仍 LISTEN；47998 用完已杀；`unset TASKBOARD_URL`。 |
| ⑥ 回归 + 审查 | 做到 | `npm run check > /tmp/check-d17r.log 2>&1; e=$?` → **0**；`ℹ tests 152` / `ℹ pass 152` / `ℹ fail 0`；vitest `Tests  14 passed (14)`（≥14）。`git diff 58f205e..HEAD -- test/ \| grep -cE '^-\s*(test\|it)\('` → **0**。`git diff 58f205e..HEAD --stat -- shared/ docs/ package.json package-lock.json README.md README.zh-CN.md web/src/components/ web/src/styles.css web/src/types.ts \| wc -l` → **0**。本文件头行 **PASS**；S3 不触发。实现 report ⑥ 标 `NOT VERIFIED` 正确。 |

Out of scope：

- 不给 `PATCH /api/inbox/:id` / `read-all` 加项目参数；不做侧栏每项目未读数；不做多选过滤：`assertAllowedQuery(…, new Set(), "POST /api/inbox/read-all")` 与 `PATCH /api/inbox/:id` 仍空集（`:1321` `:1340`）；read-all 冒烟 `updated: 2` 跨项目。没做错。
- 不动 `InboxView`、`types.ts`、`styles.css`；不改折叠逻辑、事件名、payload：`web/src/components/` / `types.ts` / `styles.css` two-dot 空；`collapsed_count` 6=6；`.emit("` 去重 17，`comm -3` base vs HEAD 空。没做错。
- 不动 `shared/**`、`docs/**`、`README*`、`package.json`、`package-lock.json`、`.teams-orca*.json`、`AGENTS.md`、`CLAUDE.md`：two-dot 对这些 pathspec 空（本席 VERDICT 在 `docs/research/D17/`，不计入实现 diff）。没做错。
- 不重起 47823、不碰主仓 `.data/`：commit 不含 `.data/`；本席未碰 47823（pid 8847 仍在）；活库只用 `.scratch/d17-native/live-review`；实现席 `live/` mtime 审查前后均为 `1788744518`；主仓 `.data/taskboard.sqlite` mtime 均为 `1788700980`。没做错。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `58f205e..575f7af`）：

1. 断言删除：`--diff-filter=D -- test/` 空。`git diff … -- test/` 删除行含 `assert|expect`：**none**。`grep -cE '^-\s*(test|it)\('` → **0**。`test/inbox.test.mjs` / `test/cli.test.mjs` `grep -c '^-[^-]'` 各 **0**。新增 `\.skip\(|\.only\(`：空。`# tests` = **152**（不 < 152）。未命中。
2. 守卫：diff 无新增 `|| true`、无新增空 `catch`。`assertTrustedNetworkRequest` 仍在 handler 入口 `app.mjs:1063`；`assertAllowedQuery` GET inbox 仍调用（`:1304`，白名单扩 `projectId`）；read-all / PATCH 仍 `Set()`；`assertAllowedKeys` / `validateOptions` 未删调用。未命中。
3. 门禁：commit message 与 diff 无 `--no-verify` / `--force`。未命中。
4. 判据：`docs/briefs/**` `docs/agents/**` `docs/research/**`（实现 diff）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `web/src/components/**` `web/src/types.ts` `web/src/styles.css` `README*` `package*.json` 无 diff。未命中。
5. 验证替代：`test/inbox.test.mjs` 新用例无 mock/stub `database` 或 `EventHub`（走 `createTaskboardServer`）。CLI mock fetch 是既有约定。冒烟 `mktemp -d` 建了第二个项目 `beta`。未命中。

清单 5 项全 0。

其它：

1. **注入面**：`listInbox` SQL 的 projectId 是 `?` 占位（`:1935` `:1953`）。47998 亲跑 `curl -G --data-urlencode "projectId=local' OR 1=1--"` → **404** `PROJECT_NOT_FOUND`，message `Project 'local' OR 1=1--' does not exist`，不是 200。
2. **state 与 projectId 组合**：47998 临时库 beta 造 1 已读 + 1 未读后 `?projectId=beta&state=all` → items **2**、`unreadCount` **1**（`readAtNull [False, True]`）；`?projectId=local&state=all` items **1**，taskId 与 beta 行不相交。
3. **Web 切项目**：`refreshInbox` deps 含 `selectedProjectId`（`:1043`）；`ALL_PROJECTS_ID` 走 `undefined` 即全局。`npm run build` e=0 后 `test -f dist/web/index.html` e=0（不开浏览器）。
4. **Origin / Host 仍生效**：`curl "http://127.0.0.1:47998/api/inbox?projectId=beta" -H 'Origin: https://evil.example'` → GET **403** `INVALID_ORIGIN` / `Request Origin must be local or private`。`PATCH /api/inbox/x` 同伪造 Origin → **403** `INVALID_ORIGIN`（同文案）。`assertTrustedNetworkRequest` 与调用点 two-dot 零改（函数与 base 逐字相同）；GET 带 `Origin` 也走同一入口（`:1063`），与补充打点所写「既有 GET 不校 Origin → 200」不符，属既有而非 D17 引入。PATCH 403 不变。
5. **CLI 组合**：两种都做。mock 用例 `inbox list forwards --project` 断言 `--project beta --state all` 时 `projectId=beta` 且 `state=all`。47998 真跑 `inbox list --project beta --state all --json` → unread **1** rows **2**（与打点 2 的 beta 1 已读 + 1 未读一致），两参数都生效。
6. **diff 体积**：`git diff --stat 58f205e..HEAD` 原文：
   ```
    cli/taskctl.mjs     |  5 +--
    server/app.mjs      | 11 +++++--
    server/database.mjs | 32 +++++++++++++-----
    test/cli.test.mjs   | 23 +++++++++++++
    test/inbox.test.mjs | 93 +++++++++++++++++++++++++++++++++++++++++++++++++++++
    web/src/App.tsx     |  7 ++--
    web/src/api.ts      | 12 ++++---
    7 files changed, 164 insertions(+), 19 deletions(-)
   ```
   `git diff --numstat`：`server/database.mjs` `24 8` 净增 **16** ≤ 25；`server/app.mjs` `9 2` 净增 **7** ≤ 12；`web/src/App.tsx` `5 2` 净增 **3** ≤ 6。

另核：审查开始时 `git rev-list --count 58f205e..HEAD` = **1**；`git diff-tree -r --numstat --no-commit-id HEAD` 原文：
```
3	2	cli/taskctl.mjs
9	2	server/app.mjs
24	8	server/database.mjs
23	0	test/cli.test.mjs
93	0	test/inbox.test.mjs
5	2	web/src/App.tsx
7	5	web/src/api.ts
```
`wc -l` = **7**，每行路径均在议题允许的 7 个文件内。`git ls-remote --heads origin spec/17` 空、`git branch -r --list 'origin/spec/17'` 空（未 push）。`git log --format=%b 58f205e..575f7af | grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --summary` 0 行。

## 局限

- impl report ① `grep -c 'pathname === "/api/inbox"'` 未 `-F`（Standards §3）；议题原文即无 `-F`，针无 `$`，本席 `grep -F` 计数相同。建议级。
- `listInbox` 把 projectId 绑定写了两遍（items / unreadCount）；`state=all` 时 COUNT 必须保留未读谓词，不能共用一组 `conditions`。判断级味道，非产品缺陷。
- `web/src/api.ts:134` `if (projectId)` 按真值省略空串，不会打到路由的 400 空串分支；`App.tsx` 只传 `undefined` 或非空 id。建议级。
- 补充打点 4：伪造 Origin 的 GET `/api/inbox?projectId=beta` 本席取值 **403** `INVALID_ORIGIN`，不是 brief 写的 200。`assertTrustedNetworkRequest` 对所有方法、只要带了非可信 `Origin` 就 403，two-dot 未改该函数。PATCH 403 与 brief 一致。不构成 D17 产品缺陷。
- 未开浏览器；Web 切项目以 `App.tsx` diff + typecheck + `dist/web/` 存在 + API 冒烟为准。
- `grep -oE '\.emit\("[a-z.]+"'` 匹配不到带连字符的 `client-storage.updated`（既有，不在 server emit 列表；base/HEAD emit 去重均为 17，`comm -3` 空）。`App.tsx` `EVENT_NAMES` 仍 18（含 `client-storage.updated`），不在 two-dot 内。
- 未造 `projectId` 含 NUL / 超长 / 与 `getProject` 撞车的极端 id；注入面已用 `local' OR 1=1--` 亲跑 404。
