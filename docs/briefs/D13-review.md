# D13 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/13>（`gh issue view 13 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」4 条。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d13-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d13r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：三个 case 是否与既有 `comment list` / `attachment list` 同形（表驱动、`expectOperandCount`、`usageError`、`URLSearchParams`）而不是另起一套；校验是否全部先于 `api.request`；`inbox mark` 的 id 是否 `encodeURIComponent`；`read-all` 是否真的不传 body；有没有顺手改了既有命令、帮助或错误消息（`git diff` 的删除行逐条看）；重复、猜测性抽象（Fowler 味道基线）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（① 的 grep / `--help` 判据逐字跑；② 五种用法错误亲手敲一遍、核 exit 与 stderr JSON；③ 六串各 `grep -c -F`，并读用例体确认负例 fetch 里 `assert.fail`、`read-all` 断言 body 与 content-type 均 undefined、归属用例 `env: {}`；④ 冒烟**亲跑一遍**（端口 **47998**、`TASKBOARD_URL` 同改，别用 47999），活库副本段也跑；⑤ `npm run check` 亲跑取尾三数与 vitest 行 + 越界 diff）。先把条数写在 verdict 开头。Out of scope 4 条做了也算做错（尤其：动了 `server/` `web/` `shared/` `docs/` `README*` `package*.json`、加了 `inbox --help` 作用域、给 inbox 列了 `thread-id`、改了既有命令的合约）。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（三个命令任一路径 / 方法 / body 不对、校验没挡住就发了请求、`--state` 合法值漏一个、id 未编码、`read-all` 带了 body 导致服务端 400、要求了会话归属、既有用例掉、既有命令合约变、pathspec 外有 diff）= 必修；错误消息措辞、帮助文本对齐、用例命名 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**` 删除行含 `assert|expect`；新增 `\.skip\(|\.only\(`；`# tests` < 141。
2. 守卫被关：断言型命令后新增 `|| true`；新增空 `catch`；`validateOptions` / `expectOperandCount` 被绕过；`normalizeError` 被改。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D13/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `server/**` `web/**` `shared/**` `README*` `package*.json` 改动 = 命中，本议题无豁免。
5. 验证被替代：冒烟没起真服务（只靠 mock 测试）；正例用例没断言 `pathname` / `method`。

## 补充打点（两轴没覆盖的，逐条取值）

1. **校验先于请求**：读三个 case 的代码顺序；再对 47998 用 `--state foo` / 缺 `--state` / 多余位置参数各敲一次，服务端日志（`$D/server.log` 或 `lsof`）无对应请求到达（或 mock 用例里 `assert.fail` 覆盖了这三条）。
2. **Origin / Host 仍生效**：`curl -X PATCH http://127.0.0.1:47998/api/inbox/x -H 'Origin: https://evil.example' -H 'content-type: application/json' -d '{"state":"read"}'` → 403 `INVALID_ORIGIN`（服务端没动，只是确认 CLI 用例不依赖放宽）。
3. **`--json` 与无 `--json` 输出一致**：`inbox list` 加不加 `--json` stdout 都是同一份 JSON（既有命令合约：`--json` 只是显式声明）。
4. **退出码合约**：`inbox mark nope --state read` 的 exit 与 `issue get nope` 的 exit 相同（同为服务端 404 走 `normalizeError`）；取两个值贴上。
5. **帮助文本**：`node cli/taskctl.mjs --help` 全文贴；三行缩进与 `attachment upload` 行一致；`taskctl inbox --help` → exit 2（无新作用域，符合 OOS）。
6. **diff 体积**：`git diff --stat $base..HEAD` 原样贴；`cli/taskctl.mjs` 删除行数（`grep -E '^-' | grep -vE '^---'`）≤ 2，多于 2 逐行列出是什么。

另核：恰 1 个 commit 且 pathspec 恰 2 个文件（`git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 2）· 未 push · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D13 R1-VERDICT (#13)" -- docs/research/D13/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D13/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 用完杀掉、`unset TASKBOARD_URL`。6. 🔴 判退出码不用管道；判字面串 `grep -F`。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d13-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D13/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d13-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 6 条各一句判定 + 补充打点 6 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
