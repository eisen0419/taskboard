# D17 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/17>（`gh issue view 17 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」4 条。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d17-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d17r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：`listInbox` 是否用 `conditions` / `values` 拼接（与 `listTasks` 同形）而不是字符串拼 projectId（注入面）；`unreadCount` 是否与 items 用同一组条件；路由层项目存在性检查是否复用了 `:1285` 那条路径同一个 database 方法；App.tsx 是否只改了 `refreshInbox` 及其 deps（没顺手动别的 effect）；CLI case 是否照 `issue list` 的 `search.set` 写法；重复、过长函数、散弹式修改、猜测性抽象（Fowler 味道基线）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（①②④ 的 grep / awk / diff 判据逐字跑；③ 五串各 `grep -c -F`，读用例体确认走真服务、404 用例真的请求了不存在的 id；⑤ 冒烟 5 步**亲跑一遍**（端口 **47998**，`TASKBOARD_URL` 同改，别用 47999），活库段也跑；⑥ `npm run check` 亲跑取尾三数与 vitest 行 + 越界 diff）。先把条数写在 verdict 开头。Out of scope 4 条做了也算做错（尤其：给 PATCH / read-all 加了 projectId、动了 `components/` / `types.ts` / `styles.css`、改了折叠逻辑或事件）。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（带 projectId 时 items 或 unreadCount 任一没过滤、不带时行为变了、未知项目不 404、空串不 400、Web 切项目收件箱不跟、CLI `--project` 没拼进 query、既有用例掉、事件名数 ≠ 17、pathspec 外有 diff、SQL 字符串拼接用户输入）= 必修；帮助文案措辞、helper 命名 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**` 删除行含 `assert|expect`；新增 `\.skip\(|\.only\(`；`# tests` < 152。
2. 守卫被关：断言型命令后新增 `|| true`；新增空 `catch`；`assertTrustedNetworkRequest` / `assertAllowedQuery` / `assertAllowedKeys` / `validateOptions` 被绕过或删调用。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D17/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `web/src/components/**` `web/src/types.ts` `web/src/styles.css` `README*` `package*.json` 改动 = 命中，本议题无豁免。
5. 验证被替代：新增测试 `mock|stub` 了 `database` 或 `EventHub`（服务端用例必须经真实 `createTaskboardServer`；cli 用例用 mock fetch 是既有约定，不算）；冒烟没建第二个项目。

## 补充打点（两轴没覆盖的，逐条取值）

1. **注入面**：`listInbox` 的 SQL 里 projectId 必须是 `?` 占位；`?projectId=local' OR 1=1--` → 404 `PROJECT_NOT_FOUND`（项目不存在），不是 200。亲跑。
2. **state 与 projectId 组合**：`?projectId=beta&state=all` 在 beta 有 1 已读 + 1 未读时 items 2、`unreadCount` 1；`?projectId=local&state=all` 不含 beta 的行。
3. **Web 切项目**：读 `App.tsx` diff 确认 `refreshInbox` deps 含 `selectedProjectId`，且 `ALL_PROJECTS_ID` 走全局；`npm run build` 后 `dist/web/` 存在（不开浏览器）。
4. **Origin / Host 仍生效**：`curl "http://127.0.0.1:47998/api/inbox?projectId=beta" -H 'Origin: https://evil.example'` → GET 仍 200（既有：GET 不校 Origin）而 `PATCH /api/inbox/x` 带伪造 Origin → 403（不变）。取值贴上。
5. **CLI 组合**：`inbox list --project beta --state all --json` 两参数都在 query（mock 用例或 47998 真跑二选一，说明是哪种）。
6. **diff 体积**：`git diff --stat $base..HEAD` 原样贴；`server/database.mjs` 净增 ≤ 25、`server/app.mjs` ≤ +12、`web/src/App.tsx` ≤ +6。超过写进「局限」不计 finding。

另核：恰 1 个 commit 且 pathspec 内（`git diff-tree -r --numstat --no-commit-id HEAD` 每行路径在议题允许的 7 个文件内）· 未 push · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D17 R1-VERDICT (#17)" -- docs/research/D17/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D17/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 用完杀掉、`unset TASKBOARD_URL`。6. 🔴 判退出码不用管道；判字面串 `grep -F`；别把命令存进变量再 `$VAR` 展开；`python3 -c` 单行别用嵌套引号 f-string。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d17-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D17/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d17-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 6 条各一句判定 + 补充打点 6 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
