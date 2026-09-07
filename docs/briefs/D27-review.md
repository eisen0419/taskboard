# D27 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/27>（`gh issue view 27 --comments`）——Spec 轴的判据真源是它的「验收」5 条与「Out of scope」4 条。本卡实现是一行替换，你的主要增量是验收 ④ 的真浏览器行为。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d27-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d27r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：diff 是否恰一删一增且只换了函数名（缩进 / 参数 / 分号未动）；`selectBoardView` 是否是函数声明（`function selectBoardView`，声明在调用之后靠提升可用，不是 `const` 箭头函数，否则 TDZ）；没有顺手改别的。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」5 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（①② 的 grep / awk / diff 判据逐字跑；③ `npm run check` 亲跑取尾三数与 vitest 行 + 冻结面零 diff；④ 真浏览器亲做，见补充打点 1；⑤ 本文件）。先把条数写在 verdict 开头。Out of scope 4 条做了也算做错（尤其：动了 `selectBoardView` 定义、动了 `openInboxTask`、动了 `CommandPalette*`、加了测试文件、pathspec 外有 diff）。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（④ 刷新后视图回弹、键值不是 `"gantt"`、面板切视图后甘特菜单 / 右键菜单仍开着；diff 不是恰一行、改错了行、`selectBoardView(` ≠ 8 或 `setBoardView(` ≠ 6；既有用例掉、`# tests` ≠ 158、vitest ≠ 26；pathspec 外有 diff）= 必修；内嵌浏览器不可用导致 ④ 没做 = 写进「局限」不计必修（①–③ 必须全过）。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**`、`web/src/**/*.test.ts*` 任何 diff；`# tests` ≠ 158；vitest ≠ 26。
2. 守卫被关：diff 里新增 `|| true`、空 `catch`、`as any`、`// @ts-`；`package.json` 任何 diff。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D27/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `server/**` `cli/**` `shared/**` `test/**` `web/src/components/**` `README*` `knip.json` 改动 = 命中，本议题无豁免。
5. 验证被替代：report 里的「check e=0」不是用 `npm run check > log; e=$?` 取的；①② 的取值没贴或与你亲跑不一致。

## 补充打点（两轴没覆盖的，逐条取值）

1. **真浏览器（议题 ④）**：方法同 D19 R1 打点 7。临时 DATA_DIR 起 **47998**（`D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &`，先 `npm run build`），`orca tab create --url http://127.0.0.1:47998/?project=local`。按序取值贴 VERDICT：(a) 打开时 `localStorage.getItem("taskboard.project-view.v1.local")` 取值（预期 `null`）与 `aria-pressed="true"` 的页签文案（预期「议题看板」）；(b) Cmd/Ctrl+K 开面板 → 选「甘特图」（键盘 ↓ 到该行 Enter，或对该行派 click）→ 面板关、`aria-pressed="true"` 页签 =「甘特图」、键值 = `"gantt"`；(c) 刷新（`location.reload()` 或重新 navigate 同 URL）→ `aria-pressed="true"` 页签仍「甘特图」、键值仍 `"gantt"`；(d) 再开面板选「收件箱」→ 键值 `"inbox"`。(c) 回到「议题看板」= 必修。用完 `kill $(lsof -tiTCP:47998 -sTCP:LISTEN)` 并关 tab。内嵌浏览器打不开 / 脚本注入不可用：写「局限」，不算必修。
2. **对照基线（可选）**：`git worktree add /tmp/d27-base $(git merge-base origin/main HEAD)` → 该工位 `npm install` + `npm run build` → 47997 起 → 同一操作 (b)(c)，预期 (c) 回弹到「议题看板」且键值仍 `null`（证明本卡修的是真问题）。做了贴取值；不做写「局限」。用完 `git worktree remove /tmp/d27-base` 并杀 47997。
3. **只换函数名**：`git diff $base..HEAD | grep -E '^[-+][^-+]' | sed -E 's/^[-+]//' | sort -u | wc -l` = **2**；两行去掉 `select` 前缀后相等：`git diff $base..HEAD | grep -E '^[-+][^-+]' | sed -E 's/^[-+]//; s/selectBoardView/setBoardView/' | sort -u | wc -l` = **1**。
4. **面板其它分支零 diff**：`git diff $base..HEAD | grep -cE 'setSelectedProjectId|openTaskDetail|setPaletteOpen|setPaletteQuery'` = **0**。
5. **定义形态**：`grep -c '^  function selectBoardView(view: BoardView) {' web/src/App.tsx` = **1**（函数声明，提升可用）；`grep -n 'function handlePaletteSelect\|function selectBoardView' web/src/App.tsx` 两行取值贴（调用在前、声明在后属预期）。
6. **产物与服务**：`npm run build` 后 `dist/web/index.html` 存在；47998 `/` 200、`/health` = `{"status":"ok"}`、`/api/projects` 200（打点 1 顺带取）。
7. **diff 体积**：`git diff --stat $base..HEAD` 原样贴；预期恰 `1 file changed, 1 insertion(+), 1 deletion(-)`。

另核：恰 1 个 commit 且 `git diff-tree -r --numstat --no-commit-id HEAD` 恰 `1	1	web/src/App.tsx` · 未 push · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D27 R1-VERDICT (#27)" -- docs/research/D27/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D27/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 / 47997 用完杀掉，自己开的 tab 用完关掉；临时基线工位用完 `git worktree remove`。6. 🔴 判退出码不用管道；判字面串 `grep -F`；别把命令存进变量再 `$VAR` 展开；`python3 -c` 单行别用嵌套引号 f-string。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d27-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D27/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d27-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 5 条各一句判定 + 补充打点 7 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
