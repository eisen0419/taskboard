PASS
reviewedHead: 3a600870a011cd8409609a72287ff493a0a56348
fixedPoint: ed24301c52900cadc65bcf1becbcbebf1b4cc7f7
diffCommand: git diff ed24301c52900cadc65bcf1becbcbebf1b4cc7f7..3a600870a011cd8409609a72287ff493a0a56348
commits: 3a60087 feat(taskctl): inbox list/mark/read-all subcommands over /api/inbox (#13)
implReport: /Users/happy/projects/taskboard/.scratch/d13-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/13 （验收 6 + Out of scope 4；comments 空）
conclusion: 逐条核过（①–⑤ 命令与取值均为本席亲跑；⑥ 为本席 VERDICT；补充打点 1–6 亲跑；逃避清单对 `ed24301..3a60087` 机械核；未改交付物、未 push）

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 4 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

Standards 轴 0 条硬违反（`inboxItemPath` 与既有 `taskPath`/`commentPath` 同形，判断级味道非硬违反）；Spec 轴 0 条 finding。不选总赢家。

## Standards 轴

汇总：三 case 与 `comment list` / `attachment list` 同形（表驱动、`expectOperandCount`、`usageError`、`URLSearchParams`）；校验全在 `api.request` 之前；`mark` 走 `encodeURIComponent`；`read-all` 不传第三参；既有命令合约只追加「Expected one of」与根帮助三行。report 退出码无管道、字面 `grep -F`。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d13r.log 2>&1; e=$?` → **0**；`npm run check > /tmp/check-d13r.log 2>&1; e=$?` → **0**，`ℹ tests 141` / `ℹ pass 141` / `ℹ fail 0`，vitest `Tests  13 passed (13)`，与 report 一致。新哨兵/变异：不适用。 |
| §3 本机工具陷阱 | 符合 | report ①③ 字面串均 `grep -c -F`；本席同命令重跑计数相同。无 awk `==`、无 `ps \| grep`、无 `pgrep -f` 等待环。report 冒烟首次 zsh `$T` 不分词已在 deviations 写明并用 bash 重跑；本席冒烟亦走 bash。 |
| §6 测试与断言 | 符合 | 六新用例期望为字面量（`/api/inbox`、`/api/inbox/item%2F1`、`GET`/`PATCH`/`POST`、`{ state: "archived" }`、`body`/`content-type` `undefined`）。负例 fetch 内 `assert.fail("fetch should not be called")`（`test/cli.test.mjs:661` `:665` `:695` `:699` `:725`）。归属用例 `env: {}`（`:740-742`）。无新增 `.skip(` / `.only(`。期望不从被测函数拼出。 |
| 三 case 同形 | 符合 | `COMMAND_OPTIONS` `:114-116`；`inbox list` `:440-449` 与 `comment list` `:373-378` 同 `URLSearchParams` + 有值才拼 query；`inbox mark` `:451-457` 用 `expectOperandCount` + `requiredOption` + `usageError`；`inbox read-all` `:459-461` 与 `project list` 同「零操作数 + `api.request` 不传 body」。不是另起一套。 |
| 校验先于 `api.request` | 符合 | 见 Spec ② / 补充打点 1。`validateOptions` `:314` 在 switch 前；三 case 均先 `expectOperandCount` 再请求。 |
| `inbox mark` id 编码 | 符合 | `inboxItemPath` `:1111-1113`：`encodeURIComponent(itemId)`。用例 `item/1` → pathname `/api/inbox/item%2F1`（`:687`）。 |
| `read-all` 不传 body | 符合 | `:461` `api.request("POST", "/api/inbox/read-all")` 第三参不传；`createApiClient.request` `:497-499` 仅 `body !== undefined` 时带 JSON body 与 content-type。用例 `:720-721` 断言二者 `undefined`。 |
| 既有命令 / 帮助 / 错误消息 | 符合 | two-dot 删除行恰 1：`Expected one of: … attachment list/download/upload, context current` → 同句插入 `inbox list/mark/read-all`（议题要求追加）。根帮助只在 `attachment upload` 后加三行。`Help is available for …` 与 base 逐字相同（`:281`）。`parseArgs` / `createApiClient` / `normalizeError` 不在 diff。 |
| Fowler 味道 | 判断调用，非硬违反 | `inboxItemPath` 与 `taskPath`/`commentPath` 同形复制（议题点名照 `:1078` 形状）。`URLSearchParams` 三行未抽 helper = 避免猜测性抽象。Shotgun Surgery 不适用（pathspec 两文件）。 |

Worst within Standards: 无硬违反。判断级 = `inboxItemPath` 与既有 `*Path` 同形复制（符合议题样板，非猜测性抽象）。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `ed24301..3a60087`（审查开始时实现 commit 恰 1）。任务书 baseSha `a31a3ee` 是写单时 main；实际 merge-base 是 briefs commit `ed24301`，two-dot 仍只有实现两文件。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 命令表与帮助 | 做到 | `grep -c -F '"inbox list"' cli/taskctl.mjs` → **2**。`'"inbox mark"'` → **2**。`'"inbox read-all"'` → **2**。`grep -c -F '/api/inbox' cli/taskctl.mjs` → **3**。`grep -c -F 'inbox list/mark/read-all' cli/taskctl.mjs` → **1**。`node cli/taskctl.mjs --help \| grep -c -F '  inbox '` → **3**。`grep -c -F '"thread-id"'` HEAD = **10**，`git show ed24301:cli/taskctl.mjs \| grep -c -F '"thread-id"'` = **10**。inbox 选项表 `:114-116` 仅 `state`/`json`，不列 `thread-id`。 |
| ② 参数校验不发请求 | 做到 | 47998 上亲手五次（退出码无管道）：`inbox list --state foo --json` e=**2** stderr `USAGE_ERROR` `"--state must be unread or all"`；`inbox mark x --json` e=**2** `"Missing required option --state"`；`inbox mark x --state gone --json` e=**2** `"--state must be read, unread, or archived"`；`inbox list extra --json` e=**2** `"inbox list does not accept positional arguments"`；`inbox read-all extra --json` e=**2** `"inbox read-all does not accept positional arguments"`。`node --test test/cli.test.mjs > /tmp/d13r-cli-test.log 2>&1; e=$?` → **0**，`ℹ tests 38` / `ℹ pass 38` / `ℹ fail 0`；五条负例 fetch 均 `assert.fail`。 |
| ③ 测试钉死 | 做到 | `grep -cE '^test\(' test/cli.test.mjs` → **38**。六字面串各 `grep -c -F` → 各 **1**（`inbox list forwards --state` / `inbox list rejects an invalid --state` / `inbox mark patches the item state` / `inbox mark requires a valid --state` / `inbox read-all posts without a body` / `inbox commands do not require conversation attribution`）。正例：list 断言 pathname `/api/inbox`、无 query、`--state all` 的 `searchParams`、method GET、`x-taskboard-client=taskctl`、stdout 原样 + `schemaVersion: 2`；mark 用 `item/1` → `/api/inbox/item%2F1` PATCH body `{ state: "archived" }`；read-all pathname `/api/inbox/read-all` POST、`init.body` 与 `content-type` 均 `undefined`。归属：`env: {}` 下三命令 exit 0（`:740-747`）。负例 `assert.fail` 见 ②。 |
| ④ 冒烟 | 做到 | 原块改端口 **47998**、`TASKBOARD_URL=http://127.0.0.1:47998`，临时 `DATA_DIR`、bash 亲跑。agent 建任务 `bcce6931-…` → `issue move --status in_review` e=0 → `inbox list` unreadCount **1** kind `status_changed` → `inbox mark --state read` `readAt True schema 2` → list unread **0** → `--state all` items **1** → agent 评论后 unread **1** → `inbox read-all` `{"updated":1,"schemaVersion":2}` → list unread **0** → `inbox mark nope --state read` e=**4** `INBOX_ITEM_NOT_FOUND` → `--state foo` e=**2** `USAGE_ERROR`。47823 pid **35734** 仍 LISTEN；47998 用完已杀。 |
| ⑤ 回归 | 做到 | `npm run check > /tmp/check-d13r.log 2>&1; e=$?` → **0**；`ℹ tests 141` / `ℹ pass 141` / `ℹ fail 0`；vitest `Tests  13 passed (13)`（≥13）。`git diff ed24301..HEAD -- test/ \| grep -cE '^-\s*(test\|it)\('` → **0**（test/ 仅 `@@ -622,6 +622,131 @@` 纯追加）。`git diff --stat -- server/ web/ shared/ docs/ package.json package-lock.json README.md README.zh-CN.md \| wc -l` → **0**。活库 `TASKBOARD_DATA_DIR=/Users/happy/projects/taskboard/.scratch/d13-native/live` 端口 47998：`/health` = `{"status":"ok"}`；`inbox list --json` e=**0**，`grep -c -F '"unreadCount"'` → **1**（`unreadCount` **6**）。未碰主仓 `.data/`。 |
| ⑥ 审查 | 做到 | 本文件头行 **PASS**；S3 不触发。实现 report ⑥ 标 `NOT VERIFIED` 正确。 |

Out of scope：

- 不改 `server/**` `web/**` `shared/**`；不加依赖；不改既有命令的选项表、帮助文本与错误消息（只在根 `Commands:` 与「Expected one of」追加）：`git diff --name-only ed24301..3a60087` 仅两文件；`package.json` 无 diff；删除行恰「Expected one of」一句被追加 inbox。没做错。
- 不加 `taskctl inbox --help` 作用域；不给 inbox 做人类可读表格；不加过滤 / watch：`HELP_TEXT` 无 `"inbox"` 键；`node cli/taskctl.mjs inbox --help` e=**2**，消息仍 `Help is available for taskctl, taskctl issue, and taskctl comment list`。没做错。
- 不动 `README*` `docs/**` `AGENTS.md` `CLAUDE.md` `.teams-orca*.json`：two-dot 对这些 pathspec 空（本席 VERDICT 在 `docs/research/D13/`，不计入实现 diff）。没做错。
- 不重起 47823、不碰主仓 `.data/`：commit 不含 `.data/`；本席未碰 47823（pid 35734 仍在）；活库只用 `.scratch/d13-native/live`。没做错。

另：三命令均拒 `--thread-id`（`Unknown option --thread-id` e=2），选项表未列它。没做错。

Worst within Spec: 无。建议级见「局限」（mark/read-all 正例未重复断言 `x-taskboard-client`）。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `ed24301..3a60087`）：

1. 断言删除：`--diff-filter=D -- test/` 空。删除行含 `assert|expect`：空（`wc -l` **0**）。新增 `\.skip\(|\.only\(`：空。`# tests` = **141**（不 < 141）。未命中。
2. 守卫：diff 无新增 `|| true`、无新增空 `catch`。`validateOptions` 仍在 `execute` 入口 `:314`（调用未删）；三 case 均 `expectOperandCount`；`normalizeError` 不在 diff。未命中。
3. 门禁：commit message 与 diff 无 `--no-verify` / `--force`。未命中。
4. 判据：`docs/briefs/**` `docs/agents/**` `docs/research/**`（实现 diff）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `server/**` `web/**` `shared/**` `README*` `package*.json` 无 diff。未命中。
5. 验证替代：冒烟亲起真服务（47998 LISTEN pid 32794，临时 DATA_DIR）；正例断言 `pathname` 与 `method`（list `:648-650`、mark `:687-688`、read-all `:718-719`）。未命中。

清单 5 项全 0。

其它：

1. **校验先于请求**：是。代码：`inbox list` 先 `expectOperandCount` 再枚举 `--state` 再 `api.request`（`:441-449`）；`inbox mark` 先操作数与 `requiredOption`/`includes` 再 `inboxItemPath`（`:452-457`）；`inbox read-all` 先操作数再 POST（`:459-461`）。47998 上 `--state foo` / 缺 `--state`（`inbox mark x`）/ 多余位置参数（`inbox list extra`）各敲一次，默认 `server.log` 仅 `Taskboard listening on http://127.0.0.1:47998`（服务端不记 access log）。补 `NODE_DEBUG=http`：三用法错误后 log 无 `SERVER new http connection` / 无 `/api/inbox`；随后一次真 `inbox list` 才出现 `HTTP … SERVER new http connection`。mock 负例 `assert.fail` 覆盖这三条。
2. **Origin / Host 仍生效**：是。`curl -X PATCH http://127.0.0.1:47998/api/inbox/x -H 'Origin: https://evil.example' -H 'content-type: application/json' -d '{"state":"read"}'` → HTTP **403** `{"error":{"code":"INVALID_ORIGIN","message":"Request Origin must be local or private"}}`。
3. **`--json` 与无 `--json` 输出一致**：是。冒烟后 `inbox list` 与 `inbox list --json` stdout `cmp` 相同：`{"items":[],"unreadCount":0,"schemaVersion":2}`，两命令 e=0。
4. **退出码合约**：是。`inbox mark nope --state read` e=**4** stderr `INBOX_ITEM_NOT_FOUND`；`issue get nope` e=**4** stderr `TASK_NOT_FOUND`。同为服务端 404 → `createApiClient.request` `:514` `exitCode: 4`，再走未改的 `normalizeError`。
5. **帮助文本**：`node cli/taskctl.mjs --help` 全文：
   ```
   Usage: taskctl RESOURCE ACTION [options]

   Commands:
     context current [--cwd PATH] [--json]
     project list
     project create --name NAME [--id ID] [--workspace-path PATH]
     project readme get [PROJECT_ID]
     project readme set [PROJECT_ID] (--content TEXT | --file FILE) [--if-version N]
     issue list|get|create|update|move|archive|restore|tree|relation
     comment list ISSUE_ID [--after CURSOR]
     comment add ISSUE_ID (--body TEXT | --body-file FILE) [--thread-id ID]
     comment update COMMENT_ID --body TEXT --if-version N [--thread-id ID]
     comment delete COMMENT_ID --if-version N [--thread-id ID]
     attachment list (--task ISSUE_ID | --comment COMMENT_ID) [--after CURSOR]
     attachment download ATTACHMENT_ID --output PATH
     attachment upload --file PATH (--task ISSUE_ID | --comment COMMENT_ID)
     inbox list [--state unread|all]
     inbox mark ITEM_ID --state read|unread|archived
     inbox read-all

   Global options:
     --runtime-file FILE  Use an explicit launcher runtime descriptor
     --json               Make the JSON output contract explicit
     --help               Show help for a supported command level

   Examples:
     taskctl issue get LOCAL-275 --json
     taskctl comment list LOCAL-275 --json

   Run taskctl issue --help for all issue arguments.
   ```
   三行与 `attachment upload` 均为前导 2 空格（python 计 `spaces=2`）。`node cli/taskctl.mjs inbox --help` e=**2**（无新作用域，符合 OOS）。
6. **diff 体积**：`git diff --stat $base..HEAD` 原文：
   ```
    cli/taskctl.mjs   |  35 ++++++++++++++-
    test/cli.test.mjs | 125 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
    2 files changed, 159 insertions(+), 1 deletion(-)
   ```
   `git diff $base..HEAD -- cli/taskctl.mjs | grep -E '^-' | grep -vE '^---'` 删除行数 **1** ≤ 2，即「Expected one of」旧句。

另核：审查开始时 `git rev-list --count ed24301..HEAD` = **1**；`git diff-tree -r --numstat --no-commit-id HEAD` 原文：
```
34	1	cli/taskctl.mjs
125	0	test/cli.test.mjs
```
`wc -l` = **2**。`git ls-remote --heads origin spec/13` 空、`git branch -r --list 'origin/spec/13'` 空（未 push）。`git log --format=%b ed24301..3a60087 | grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --check` 空。`git merge-base --is-ancestor a31a3ee HEAD` e=0。

## 局限

- `inbox mark` / `inbox read-all` 正例未断言 `init.headers["x-taskboard-client"]`（仅 list 用例 `:651` `:655` 锁）。header 由未改的 `createApiClient.request` `:496` 统一带上；产品路径正确。建议级。
- 默认 `server.log` 不记 access line；「请求未到达」除 mock `assert.fail` 外，本席用 `NODE_DEBUG=http` 对照（用法错误零连接、真 list 才有 `SERVER new http connection`）。
- 未开浏览器；本议题 Out of scope 不动 `web/`，以 CLI 单测 + 47998 冒烟 + 活库 list 为准。
- 正例未单独钉 `inbox list --state unread` 与 `inbox mark --state unread|read`（代码枚举含 `unread`/`all` 与 `read`/`unread`/`archived`；冒烟钉了 mark `read`，用例钉了 mark `archived` 与 list `all`；活库 `--state unread` e=0）。建议级。
