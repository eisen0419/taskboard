# D25 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/25>（`gh issue view 25 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」4 条，七项表是清理的全部允许范围。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d25-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d25r.log 2>&1; e=$?`（约 1 分钟；这会装上 knip）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：`package-lock.json` 的改动是否只有 knip 子树新增 + smol-toml 移除（`git diff $base..HEAD -- package-lock.json | grep -E '^[-+]\s+"node_modules/' | grep -vE 'node_modules/(knip|smol-toml)' | head`——knip 的传递依赖也算 knip 子树，看包名判）；删代码是否「整块删」而不是留下空壳或注释掉；去 `export` 的三处类型与两处符号是否保留了定义；重复、散弹式修改（Fowler 味道基线）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（①②④ 的 grep / python / diff 判据逐字跑；③ `npm run knip` 亲跑；⑤ `npm run check` 亲跑取尾三数与 vitest 行 + 零行为 diff + 临时服务 + `npm ls smol-toml` 只经 knip 一条路径）。先把条数写在 verdict 开头。Out of scope 4 条做了也算做错（尤其：删了表外的东西、`knip.json` 出现 `ignore*` 或 `rules`、动了 `InlineMediaComposer.test.tsx` 或 `test:components`、改了 `server/app.mjs` 等零 diff 文件）。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（knip 非零退出或有 Unused、`check` 没接 knip、删了表外符号 / 文件、去 `export` 时把定义也删了导致 typecheck 靠别的改动补、`package.json` 或 lock 根直接依赖仍有 `smol-toml`、既有用例掉、`# tests` ≠ 158、vitest ≠ 26、pathspec 外有 diff、`knip.json` 用了豁免）= 必修；`check` 里 knip 的位置、删除后的空行 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**`、`web/src/**/*.test.ts*` 任何 diff；`# tests` ≠ 158；vitest ≠ 26。
2. 守卫被关：`knip.json` 含 `ignore` 以外的 `ignore*` 键或 `rules`；`check` 脚本里 knip 后面接 `|| true`；`package.json` 其他脚本被改。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D25/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `server/app.mjs` `server/database.mjs` `cli/**` `test/**` `web/src/App.tsx` `README*` 改动 = 命中，本议题无豁免。
5. 验证被替代：report 里的「knip e=0」不是用 `npm run knip > log; e=$?` 取的；第一次 knip log 没贴。

## 补充打点（两轴没覆盖的，逐条取值）

1. **第一次 knip log 与议题表一致**：impl report 贴的 `/tmp/knip-1.log` 是否恰七类项、无表外项；你在工位对 `<base>` 也跑一次（`git stash` 不许，用 `git worktree add /tmp/d25-base <base>` 临时工位装 knip 跑），贴取值后 `git worktree remove`。
2. **保留符号仍在用**：`grep -n 'TASK_PRIORITIES' shared/domain.mjs`（定义 + `:32` 使用各 1）；`grep -n 'taskConversations(' web/src/taskConversations.ts`（定义 + 使用）；`grep -n 'fileKey\|MAX_ATTACHMENT_SIZE' web/src/components/InlineMediaComposer.tsx` ≥ 1。
3. **lock 只动两处子树**：`git diff $base..HEAD -- package-lock.json | grep -E '^\+\s+"node_modules/' | grep -vc 'node_modules/knip'`（取值贴；knip 的传递依赖包名不含 knip 的写进「局限」逐个列出并说明是 knip 的依赖，不计 finding）；`node_modules/smol-toml` 仍在 lock 是预期（knip 6.34.0 自身依赖 `^1.8.0`，ESCALATION-9）：核 lock 里它 `dev: true`、版本 1.8.x、根 `packages[""].dependencies` 无 smol-toml、`npm ls smol-toml` 只经 knip 一条路径。
4. **knip 版本与 Node**：`npx knip --version` = 6.34.0；`node --version` 贴；`npm ls knip` 贴。
5. **产物功能不变**：`npm run build` 后 `dist/web/index.html` 存在；临时服务 `/` 200、`/api/inbox` 200。
6. **diff 体积**：`git diff --stat $base..HEAD` 原样贴；除 `package-lock.json` 外净删 ≥ 100 行、净增 ≤ 15 行（knip.json + package.json）。超出写进「局限」。

另核：恰 1 个 commit 且 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 10 · 未 push · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D25 R1-VERDICT (#25)" -- docs/research/D25/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D25/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 用完杀掉；临时基线工位用完 `git worktree remove`。6. 🔴 判退出码不用管道；判字面串 `grep -F`；别把命令存进变量再 `$VAR` 展开；`python3 -c` 单行别用嵌套引号 f-string。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d25-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D25/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d25-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 6 条各一句判定 + 补充打点 6 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
