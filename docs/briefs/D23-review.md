# D23 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/23>（`gh issue view 23 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」4 条。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d23-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d23r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：`groupColumnTasks` 是否纯函数、泛型约束是否只用 `id` / `relations.parent.id`（不 import React / types）；算法是否 O(n)（Map 预分组，不是每个父任务 filter 一遍）；`BoardColumn` 是否只把三个 Map 的数据源换成 `orderedTasks`、渲染循环换成 rows，含 `drag` 的行零删除；`TaskCard` 零 diff；App 只加 state + toggle + 两个 prop；样式只用现有变量；重复、过长函数、散弹式修改、猜测性抽象（Fowler 味道基线）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（①②③ 的 grep / diff 判据逐字跑；① 六串各 `grep -c -F`，读用例体确认断言的是行数组的 `depth` / `childCount` / `hidden` / 顺序，不是只断言长度；④ `npm run typecheck` / `build` / `check` 亲跑取尾三数与 vitest 行 + 越界 diff；⑤ 冒烟亲跑（端口 **47998**，别用 47999））。先把条数写在 verdict 开头。Out of scope 4 条做了也算做错（尤其：动了 `server/` `cli/` `test/` `types.ts` `api.ts` `TaskCard.tsx` `OtherTasksPanel.tsx`、改了拖放、做了落盘、做了多层嵌套）。

**真浏览器打点（尽力，非必修）**：本窗若能用 Orca 内嵌浏览器（上一卡 D19 你用 `orca tab create --url` 成功过），在 47998 造 P / C1 / C2 / X（冒烟脚本已造），打开 `/?project=local`：① todo 列里 P 卡片下有 `subtask-toggle`，文案「2 个子任务」，`aria-expanded="true"`；② C1 / C2 在 `.board-card-nested` 里紧跟 P，X 平铺；③ 点开关后 C1 / C2 不在 DOM、`aria-expanded="false"`；④ 再点回来；⑤ 列头计数仍 4。把 DOM 取值逐步写进 VERDICT「补充打点 7」。做不到就写「未做真浏览器交互，以纯函数用例为准」，不算 finding。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（同列子任务没嵌套或嵌到错的父下、跨列子任务被嵌了、二层被嵌了、折叠没隐藏或隐藏了别的卡、`childCount` 错、开关不出现或 `aria-expanded` 不翻转、拖放行被删或 `findDropBefore` 被改、`TaskCard` 有 diff、无关系时渲染变了、既有用例掉、`# tests` ≠ 158、pathspec 外有 diff、加了依赖）= 必修；文案、缩进像素、箭头符号 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**`、`web/src/**/*.test.ts*` 删除行含 `assert|expect`；新增 `\.skip\(|\.only\(|@ts-ignore|@ts-nocheck`；`# tests` ≠ 158；vitest < 26。
2. 守卫被关：新增 `|| true`、空 `catch`；`BoardColumn` 含 `drag` 的行有删除（`grep -ci drag` 计数比基线少）。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D23/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `server/**` `cli/**` `test/**` `web/src/types.ts` `web/src/api.ts` `web/src/components/TaskCard.tsx` `web/src/components/OtherTasksPanel.tsx` `package-lock.json` 改动 = 命中；`package.json` 除 `test:components` 一行外改动 = 命中。
5. 验证被替代：单测 mock 了 `groupColumnTasks` 自身；冒烟没建 parent 关系就断言。

## 补充打点（两轴没覆盖的，逐条取值）

1. **无关系保序**：对 `groupColumnTasks([a, b, c], new Set())` 断言输出 id 顺序与输入一致且全 `depth 0`（用例应有；没有你就在 VERDICT 里用 `node -e` 跑一次贴取值）。
2. **子任务先于父出现在输入里**：`[c1, P, c2]` → 输出 `P, c1, c2`（子任务在父之前的原位置被移除，不重复）。
3. **父在本列但父自己是嵌套行**：`[P, c, g]`（g→c→P）→ g `depth 0` 平铺；再对 `collapsedParents = {c}` 断言 g 不受影响（c 不是 depth 0，没有开关）。
4. **折叠后拖拽落点**：读 `findDropBefore`，确认它仍按 DOM `[data-task-id]` 取落点，隐藏的子任务不在 DOM 所以不会成为落点；`getTaskDragShift` 用的 Map 数据源是 `orderedTasks`。贴行。
5. **列头计数**：折叠后 `tasks.length` 不变（浏览器或读代码）。
6. **diff 体积**：`git diff --stat $base..HEAD` 原样贴；`BoardColumn.tsx` 净增 ≤ 45、`App.tsx` ≤ +20、`boardGrouping.ts` ≤ 60 行。超过写进「局限」不计 finding。
7. **真浏览器**：见上节。

另核：恰 1 个 commit 且 pathspec 恰 6 个文件（`git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 6）· 未 push · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D23 R1-VERDICT (#23)" -- docs/research/D23/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D23/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 用完杀掉、`unset TASKBOARD_URL`；自己开的内嵌浏览器页用完关掉。6. 🔴 判退出码不用管道；判字面串 `grep -F`；别把命令存进变量再 `$VAR` 展开；`python3 -c` 单行别用嵌套引号 f-string。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d23-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D23/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d23-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 6 条各一句判定 + 补充打点 7 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
