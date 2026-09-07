# D21 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/21>（`gh issue view 21 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」4 条。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d21-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d21r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：`limit` 是否 `?` 占位（不是字符串拼进 SQL）；内层 DESC / 外层 ASC 的双重排序是否都带 `id` 作 tie-break；`hasMore` 的 COUNT 是否与主查询同一个 `task_id` 条件；路由校验是否复用 `assertAllowedQuery` 与 `parseTaskTreeQuery` 的整数写法（不是另造一套）；`pr-review-regressions` 是否真的只改了一个标记字符串；TaskDetail 是否只加 state + 一行提示，没动既有 effect 的取消 / 错误路径；重复、过长函数、散弹式修改、猜测性抽象（Fowler 味道基线）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（①②④ 的 grep / awk / diff 判据逐字跑；③ 六串各 `grep -c -F`，读 `default limit is 100` 用例体确认真的造了 101 条并断言第一条是第 2 次变更；⑤ 冒烟 3 步**亲跑一遍**（端口 **47998**，别用 47999），活库段也跑；⑥ `npm run check` 亲跑取尾三数与 vitest 行 + 越界 diff）。先把条数写在 verdict 开头。Out of scope 4 条做了也算做错（尤其：给 `#activitiesForTasks` 加了上限、做了加载更多、动了 `types.ts` / `App.tsx` / `cli/`）。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（默认取回的不是最新 N 条或顺序不是升序、`hasMore` 错、`limit` 校验漏一种、旧的「不接受 query」行为残留、`pr-review-regressions` 改了标记以外的东西或该测试不绿、既有用例掉、事件名数 ≠ 17、pathspec 外有 diff、SQL 拼接用户输入）= 必修；提示文案、样式、常量位置 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**` 删除行含 `assert|expect`（唯一豁免 = `pr-review-regressions.test.mjs` 那一行标记字符串，议题原句「只改那一个标记字符串」；`git diff $base..HEAD -- test/pr-review-regressions.test.mjs | grep -E '^-' | grep -vE '^---' | wc -l` 必须 = 1 且该行含 `listTaskActivities(taskId)`，多一行或改了正则即命中）；新增 `\.skip\(|\.only\(`；`# tests` < 158。
2. 守卫被关：断言型命令后新增 `|| true`；新增空 `catch`；`assertTrustedNetworkRequest` / `assertAllowedQuery` 被绕过或删调用；`#requireTask` 仍在 `listTaskActivities` 开头。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D21/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `cli/**` `web/src/App.tsx` `web/src/types.ts` `README*` `package*.json` 改动 = 命中，本议题无豁免。
5. 验证被替代：新增测试 `mock|stub` 了 `database`；冒烟用 fixture 库而非临时空库；`default limit is 100` 用例没真造 101 条。

## 补充打点（两轴没覆盖的，逐条取值）

1. **同毫秒 tie-break**：临时库里对同一议题连打 3 次 PATCH（脚本内不 sleep），`?limit=2` 取回的两条与默认取回的最后两条 `id` 一致（内外层都带 `id` 排序才稳定）。取值贴上。
2. **hasMore 边界**：活动恰 N 条时 `?limit=N` → `hasMore` false；`?limit=N-1` → true。
3. **404 仍在**：`GET /api/tasks/nope/activities` → 404 `TASK_NOT_FOUND`（`#requireTask` 未被绕过）。
4. **Origin 仍生效**：带伪造 `Origin` 的 GET → 403 `INVALID_ORIGIN`（既有；确认未放宽）。
5. **列表页查询零 diff**：`git diff $base..HEAD -- server/database.mjs | grep -c 'activitiesForTasks'` = 0，且 `pr-review-regressions` 的 listQuery 断言仍绿（跑该文件单测）。
6. **diff 体积**：`git diff --stat $base..HEAD` 原样贴；`server/database.mjs` 净增 ≤ 20、`server/app.mjs` ≤ +12、`TaskDetail.tsx` ≤ +8。超过写进「局限」不计 finding。

另核：恰 1 个 commit 且 pathspec 内（`git diff-tree -r --numstat --no-commit-id HEAD` 每行路径在议题允许的 7 个文件内）· 未 push · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D21 R1-VERDICT (#21)" -- docs/research/D21/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D21/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 用完杀掉。6. 🔴 判退出码不用管道；判字面串 `grep -F`；别把命令存进变量再 `$VAR` 展开；`python3 -c` 单行别用嵌套引号 f-string。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d21-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D21/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d21-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 6 条各一句判定 + 补充打点 6 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
