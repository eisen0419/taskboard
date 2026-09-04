# D2 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/2>（`gh issue view 2 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」4 条，加 Fable 的勘正评论（④ 列名、`CODEX_AGENT_ACTOR` 是常量、A/B 两处删的裁决）。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`.teams/<team>/reports/task-1.*.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d2r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看三件：改名一致（同一旧名在 server / cli / web / test 四处映射到同一新名，抽 `agentProjectId` `thread_agent_host_id` `TASKBOARD_THREAD_ID` `AGENT_ACTOR` 四个各 `git grep -n` 核）；没有为了让 typecheck 过而加 `@ts-ignore` / `@ts-nocheck` / `any` 化；lock 只变 name（`git diff $(git merge-base origin/main HEAD)..HEAD -- package-lock.json | grep -cE '^[-+] '` ≤ 4）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果；先把条数写在 verdict 开头。Out of scope 4 条做了也算做错（尤其：改了状态 / 优先级枚举或文案、改了路由路径、写了旧库迁移、动了 `docs/agents` / `AGENTS.md` / `CLAUDE.md`）。A/B 两处（Codex 全局状态读取、Codex App 入口）按任务书 D2-impl「两处不是改名而是删」核：删对了 = 做到，删多了（把 `development-contexts` 路由或「复制会话 ID」按钮整个拿掉）= 做错。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（服务起不来、`TASKBOARD_*` 不生效、taskctl 不能读写、四视图坏、路由路径变了、用例数掉）= 必修；README 超 80 行、注释残留 Codex 字样、命名不够顺 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收或勘正评论明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：测试删除行含 `assert|expect` 且没有配对的新增行（改名 = 一删一增，期望值只换字面量）；`test/server.test.mjs` 原 349-380 那条允许按任务书 A 改写，其余用例删除 = 命中；新增 `@ts-ignore|@ts-nocheck|\.skip\(|\.only\(` = 命中；`# tests` ≠ 121 = 命中。
2. 守卫被关：断言型命令后新增 `|| true`；新增空 `catch`（A 处删掉的两个 `try/catch` 不算）。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D2/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` 改动 = 命中（本议题无豁免）。
5. 验证被替代：新增 `mock|stub` 落在保留测试的被测判定链上。

## 补充打点（两轴没覆盖的）

1. `npm run check > /tmp/check-r.log 2>&1; e=$?` 你自己跑：e、`# tests / # pass / # fail`（须 121 / 121 / 0）、vitest 9，与 report 对。
2. 三条机械判据你自己跑：`git grep -il codex -- . ':!docs/briefs' ':!docs/agents' ':!docs/research' | wc -l` = 0；`git grep -lE 'CODEX_[A-Z_]+' -- server shared cli web/src scripts test | wc -l` = 0；`grep -c '"name": "taskboard"' package.json` = 1 且 `grep -c '"name": "taskboard"' package-lock.json` = 2。
3. 冒烟你自己跑一遍，端口 **47998**（别撞实现席的 47999），全新临时目录不用 fixture：`D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/s.log 2>&1 &` → `/health` = `{"status":"ok"}` → `head -1 $D/s.log | grep -ci codex` = 0 → `TASKBOARD_THREAD_ID=t TASKBOARD_URL=http://127.0.0.1:47998 node cli/taskctl.mjs project list --json | grep -c '"projects"'` = 1 → 同环境 `issue create --project local --title t --json | grep -c '"creatorId": *"agent"'` = 1 → 不带 `TASKBOARD_THREAD_ID` 的 `issue create` e=2 且 stderr `grep -c USAGE_ERROR` = 1、`grep -ci codex` = 0 → `curl -s http://127.0.0.1:47998/ | grep -c '<title>Taskboard</title>'` = 1 → `kill`。
4. README：`grep -ci codex README.md README.zh-CN.md` 各 = 0；`wc -l` 各 ≤ 80；五要素（是什么 / 本地运行 / taskctl 三例 / 两条注意 / 上游致谢）逐个 `grep -n` 定位。
5. 旧库不迁移是议题明文：`git grep -n -iE 'thread_codex|ALTER TABLE.*RENAME COLUMN' -- server` = 0 行（有迁移代码 = Out of scope 做错）。
6. `git show --stat HEAD | grep -cE '^ (docs/briefs|docs/agents|docs/research|AGENTS\.md|CLAUDE\.md|LICENSE|\.data/|\.scratch/|\.orca-claims/)'` = 0。

另核：恰 1 个 commit（`git rev-list --count $(git merge-base origin/main HEAD)..HEAD`）· 未 push（`git branch -r --list 'origin/spec/2'` 为空）· `git log --format=%b $(git merge-base origin/main HEAD)..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）· `git status --porcelain` 0 行。

## 出单自检

- 任务书文件名命中 `BUDGET_BRIEF_CLASS_RULES`（`D2-review.md`）。
- baseSha 与计数基点分开：行号取写单时 HEAD `fb5850f`，计数以 `$(git merge-base origin/main HEAD)` 为基。

## 硬规则

1. 🔴 **只审不改**。
2. 🔴 禁 `git push`。
3. 🔴 产物 = `docs/research/D2/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。恰一个 commit，pathspec 只含该文件。
4. 🔴 结论写清是**逐条核过**还是**抽查未见**；反例写进「局限」。
5. 🔴 不 `kill` / 重启任何 `teams-orca run`，不动 `.teams/`，不动不是你的窗；自己起的冒烟服务用完自己停；不碰 47823 与主仓 `.data/`、`.scratch/fixtures/`。

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入交付物正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收各一句判定 + 产物路径 + commit sha。
