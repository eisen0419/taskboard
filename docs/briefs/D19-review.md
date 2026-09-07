# D19 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/19>（`gh issue view 19 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」4 条。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d19-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d19r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：`CommandPalette` 是否纯展示（零 fetch、零 `window.addEventListener`，键盘只在 input 的 `onKeyDown`）；App 里三组数据是否 `useMemo` 且 deps 完整；`handleShortcut` 既有四条是否一字不动（读 diff 的删除行）；执行动作是否复用 `openTaskDetail` / `setBoardView` / `setSelectedProjectId` 而不是复制它们的内部逻辑；样式是否只用现有 CSS 变量；`selectableIndex` 跨组编号是否与 `ComposerCompletionMenu` 同形；重复、过长函数、散弹式修改、猜测性抽象（Fowler 味道基线）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（①②③ 的 grep / awk 判据逐字跑；③ 六串各 `grep -c -F`，读用例体确认断言的是回调参数而不是只断言「被调用」；④ `npm run typecheck` / `build` / `check` 亲跑取尾三数与 vitest 行 + 越界 diff；⑤ 冒烟亲跑（端口 **47998**，别用 47999））。先把条数写在 verdict 开头。Out of scope 4 条做了也算做错（尤其：`package-lock.json` 有 diff、动了 `server/` `cli/` `test/` `api.ts` `types.ts` `taskFilters.ts`、改了既有快捷键、加了 URL 状态）。

**真浏览器打点（尽力，非必修）**：若本窗能用 Orca 内嵌浏览器（`orca browser open http://127.0.0.1:47998/` 之类；不会就 `orca --help | grep -i browser` 看一眼），走一遍：Cmd+K 面板出现 → 输 `in` → 议题组出现 → ArrowDown → Enter → 详情打开 → Esc 关；把看到的逐步写进 VERDICT「补充打点 7」。做不到就写「未做真浏览器交互，以 jsdom 用例为准」，不算 finding。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（Cmd/Ctrl+K 打不开或在输入框里失效、Esc 关不掉、↑↓ 不回绕、Enter 不执行或执行错对象、议题组在空 query 下出现、`matchesTaskSearch` 没用上、三种动作任一没接、既有快捷键行为变、既有用例掉、`# tests` ≠ 152、pathspec 外有 diff、加了依赖）= 必修；文案、样式、宽度、动画 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**`、`web/src/components/*.test.tsx` 删除行含 `assert|expect`；新增 `\.skip\(|\.only\(|@ts-ignore|@ts-nocheck`；`# tests` ≠ 152；vitest < 20。
2. 守卫被关：新增 `|| true`、空 `catch`；`handleShortcut` 的 `isTyping` 守卫被删或改（Cmd+K 段放在它之前是议题明文要求，引原句）。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D19/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `server/**` `cli/**` `test/**` `web/src/api.ts` `web/src/types.ts` `web/src/taskFilters.ts` `web/src/i18n.tsx` `package-lock.json` 改动 = 命中；`package.json` 除 `test:components` 一行外改动 = 命中。
5. 验证被替代：组件测试 mock 了 `CommandPalette` 自身或没有真的 `render`；冒烟没 `npm run build`。

## 补充打点（两轴没覆盖的，逐条取值）

1. **空 query 不列议题**：读 App 的 `paletteGroups` 构造，确认 `paletteQuery` 为空时议题组不进数组；贴相关行。
2. **上限 20**：议题组 `.slice(0, 20)` 或等价；贴行。
3. **动作对象**：`task:` 分支传给 `openTaskDetail` 的是 `tasks` 里的真对象（含 `identifier` / `projectId`），不是只传 id；贴行。
4. **索引复位**：`paletteQuery` 变化时 `paletteIndex` 归 0；贴 effect。
5. **快捷键守卫**：diff 的删除行里 `handleShortcut` 既有段落 0 行被删（`git diff $base..HEAD -- web/src/App.tsx | grep -E '^-' | grep -vE '^---' | grep -cE 'key|metaKey|ctrlKey'` 取值，预期 0；deps 数组那一行被改算 1 行，说明是它）。
6. **diff 体积**：`git diff --stat $base..HEAD` 原样贴；`App.tsx` 净增 ≤ 110、`styles.css` 净增 ≤ 90、`CommandPalette.tsx` ≤ 160 行。超过写进「局限」不计 finding。
7. **真浏览器**：见上节。

另核：恰 1 个 commit 且 pathspec 恰 5 个文件（`git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 5）· 未 push · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D19 R1-VERDICT (#19)" -- docs/research/D19/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D19/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 用完杀掉。6. 🔴 判退出码不用管道；判字面串 `grep -F`；别把命令存进变量再 `$VAR` 展开；`python3 -c` 单行别用嵌套引号 f-string。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d19-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D19/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d19-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 6 条各一句判定 + 补充打点 7 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
