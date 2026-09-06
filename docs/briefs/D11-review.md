# D11 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/11>（`gh issue view 11 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」3 条。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d11-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d11r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：`#statusChangeInboxItem` 是否真的被 `updateTask` 与 `moveTask` 共用（不是两份近似代码）；inbox 写入是否在 `moveTask` 的 `BEGIN IMMEDIATE … COMMIT` 之内；`updateTask` 抽 helper 后语义是否原样（对照 `git diff` 里被删的那段与 helper 体逐行）；重复、过长函数、散弹式修改、猜测性抽象（Fowler 味道基线）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（①②③⑤ 的 grep / wc / awk 判据逐字跑；③ 的六个字面串各 `grep -c -F`；⑤ 的 `npm run check` 亲跑取尾三数与 vitest 行；④ 冒烟 6 步**亲跑一遍**（端口 47998，别用 47999 免得撞实现席残留；`TASKBOARD_URL` 也改 47998），活库副本段也跑）。先把条数写在 verdict 开头。Out of scope 3 条做了也算做错（尤其：动了 `web/` `cli/` `shared/` `docs/` `package*.json`、改了 `updateTask` 返回形状或 `#recordTaskActivity`、加了新事件名）。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（服务起不来、agent move 到三档状态任一不写、同状态 move 或 user move 写了、summary 格式与 PATCH 路径不一致、SSE 不发、既有用例掉、事件名数 ≠ 17、pathspec 外有 diff）= 必修；命名、helper 参数形状、注释 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**` 删除行含 `assert|expect`；新增 `\.skip\(|\.only\(`；`# tests` < 135。
2. 守卫被关：断言型命令后新增 `|| true`；新增空 `catch`；`assertTrustedNetworkRequest` / `assertAllowedKeys` / `#requireVersion` 被绕过或删调用。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D11/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `cli/**` `web/**` `package*.json` 改动 = 命中，本议题无豁免。
5. 验证被替代：新增测试 `mock|stub` 了 `database` 或 `EventHub`（写入规则与 SSE 必须经真实 `createTaskboardServer` 判定链）；冒烟第 3 步没走 `node cli/taskctl.mjs issue move`。

## 补充打点（两轴没覆盖的，逐条取值）

1. **负例经过真判定链**：`user move in_review -> none` 与 `agent move same status -> none` 两条是否真的 POST `/move` 打到服务器再 GET `/api/inbox` 断言 `unreadCount`。
2. **事务原子**：对 47998 用**过期 version** agent `POST /move` 到 `in_review` → 409，随后 `GET /api/inbox` 的 `unreadCount` 不变（inbox 没在失败事务外写入）。自己 curl 一遍。
3. **SSE payload 形状**：move 触发的 `inbox.item.created` 的 data 顶层含 `projectId` / `taskId` 与 `item`，`item.kind` = `status_changed`；`task.moved` 仍先于它到达。抓包核。
4. **活动记录不退化**：agent move 后 `task_activities` 仍多一条 status 变更（用既有活动接口或直接查临时库 `sqlite3 $D/taskboard.sqlite "select count(*) from task_activities"` 前后差 1）。
5. **归档任务 move**：`POST /archive` 后 agent `POST /move` → 409 `TASK_ARCHIVED`，`unreadCount` 不变。
6. **diff 体积**：`git diff --stat $base..HEAD` 原样贴；`server/database.mjs` 净增行数 ≤ 40（抽 helper 应接近零和）。超过写进「局限」不计 finding。

另核：恰 1 个 commit 且 pathspec 恰 3 个文件（`git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 3）· 未 push · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D11 R1-VERDICT (#11)" -- docs/research/D11/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D11/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 用完杀掉。6. 🔴 判退出码不用管道；判字面串 `grep -F`。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d11-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D11/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d11-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 6 条各一句判定 + 补充打点 6 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
