# D1 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/1>（`gh issue view 1 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」5 条。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`.teams/<team>/reports/task-1.*.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d1r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看三件：删得干净不留死引用（`git grep -lE "$(cat docs/briefs/D1-ref-re.txt)" -- server shared cli web/src scripts | wc -l` = 0）；没有为了让 typecheck 过而加 `@ts-ignore` / `@ts-nocheck` / `any` 化；没有把删除变成注释掉。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果；先把条数写在 verdict 开头。Out of scope 5 条做了也算做错（尤其：改了命名、改了四视图行为、动了 `docs/agents` / `AGENTS.md` / `CLAUDE.md`）。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（服务起不来、保留路由丢、四视图坏、taskctl 不能读写、旧库打不开）= 必修；测试删多删少、死代码没删干净 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引议题原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：**保留**测试文件的删除行里含 `assert|expect`；新增 `@ts-ignore|@ts-nocheck|\.skip\(|\.only\(`。整文件删除且落在验收①清单内的不算；清单外被整删的测试文件 = 命中。
2. 守卫被关：断言型命令后新增 `|| true`；新增空 `catch`。
3. 门禁被绕：`--no-verify|--force`；`.github/` 整删是验收①明文要求，不算命中。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `AGENTS.md` `CLAUDE.md` 改动 = 命中（本议题无豁免）。
5. 验证被替代：新增 `mock|stub` 落在保留测试的被测判定链上。

## 补充打点（两轴没覆盖的）

1. `npm run check > /tmp/check-r.log 2>&1; e=$?` 你自己跑：e、`# tests / # pass / # fail`、vitest 数，与 report 对。
2. 冒烟六步你自己跑一遍，端口 **47998**（别撞实现席的 47999）：`D=$(mktemp -d); cp /Users/happy/projects/taskboard/.scratch/fixtures/taskboard-12.sqlite $D/taskboard.sqlite; CODEX_TASKBOARD_HOST=127.0.0.1 CODEX_TASKBOARD_PORT=47998 CODEX_TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/s.log 2>&1 &` → health / `/api/tasks` = 12 / `CODEX_THREAD_ID=t CODEX_TASKBOARD_URL=http://127.0.0.1:47998 node cli/taskctl.mjs project list --json` / root html → `kill`。
3. `git ls-files | grep -cE "$(cat docs/briefs/D1-del-re.txt)"` = 0；`git ls-files | wc -l`（写单时 235）合理。
4. `grep -c '"name": "codex-taskboard"' package.json` 仍 = 1（#1 不改名；改了 = Out of scope 做错）。
5. `git show --stat HEAD | grep -cE '^ (docs/briefs|docs/agents|AGENTS\.md|CLAUDE\.md|LICENSE)'` = 0。

另核：恰 1 个 commit（`git rev-list --count $(git merge-base origin/main HEAD)..HEAD`）· 未 push（`git branch -r --list 'origin/spec/1'` 为空）· `git log --format=%b $(git merge-base origin/main HEAD)..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）· `git status --porcelain` 0 行。

## 出单自检

- 任务书文件名命中 `BUDGET_BRIEF_CLASS_RULES`（`D1-review.md`）。
- baseSha 与计数基点分开：行号取写单时 HEAD `8eff36f`，计数以 `$(git merge-base origin/main HEAD)` 为基。

## 硬规则

1. 🔴 **只审不改**。
2. 🔴 禁 `git push`。
3. 🔴 产物 = `docs/research/D1/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。恰一个 commit，pathspec 只含该文件。
4. 🔴 结论写清是**逐条核过**还是**抽查未见**；反例写进「局限」。
5. 🔴 不 `kill` / 重启任何 `teams-orca run`，不动 `.teams/`，不动不是你的窗；自己起的冒烟服务用完自己停；不碰 47823 与主仓 `.data/`。

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入交付物正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收各一句判定 + 产物路径 + commit sha。
