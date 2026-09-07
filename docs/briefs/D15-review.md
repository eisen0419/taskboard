# D15 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/15>（`gh issue view 15 --comments`）——Spec 轴的判据真源是它的「验收」6 条与「Out of scope」4 条。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d15-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d15r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：折叠逻辑是否只在 `#createInboxItem` 一处（两个调用方零改动或只改返回接法）；SELECT 折叠目标 + UPDATE 是否与调用方同一事务（`BEGIN IMMEDIATE … COMMIT` 内，不是事务外补写）；severity 比较是否用模块级排名常量而不是散落的 if；`emitInboxItem` 是否真的替换了三处而不是第四份；迁移是否照 `:573-620` 的守卫写法；Web 徽标是否只在 `InboxView`（App.tsx 零 diff）；重复、过长函数、散弹式修改、猜测性抽象（Fowler 味道基线）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」6 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（①③④ 的 grep / wc / diff 判据逐字跑；② 六串各 `grep -c -F`，并读用例体确认走真服务、迁移用例真的预建了无列的表；⑤ 冒烟 7 步**亲跑一遍**（端口 **47998**，别用 47999），旧库段也跑；⑥ `npm run check` 亲跑取尾三数与 vitest 行 + 越界 diff）。先把条数写在 verdict 开头。Out of scope 4 条做了也算做错（尤其：回填了旧行、改了 `App.tsx` / `cli/` / `api.ts`、加了事件名、改了 `unreadCount` 语义或路由形状）。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（同任务第二事件没折叠或折成了错的行、已读行被折进去、severity 降级、不同任务折到一起、`collapsedCount` 缺失或不对、SSE 折叠时仍发 created 或新行发 updated、旧库起不来或列没加上、既有用例掉、事件名数 ≠ 17、pathspec 外有 diff）= 必修；徽标文案、样式、常量命名 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**`、`InboxView.test.tsx` 删除行含 `assert|expect`（两处豁免：既有组件 fixture 补 `collapsedCount: 1`；`inbox SSE broadcasts created and updated events` 用例内恰 5 处字面值 1→0 / 2→1 / 2→3，ESCALATION-5 裁，议题②原句「只许改它的 5 处字面值」；`git diff $base..HEAD -- test/inbox.test.mjs | grep -E '^-' | grep -vE '^---' | wc -l` ≤ 5 且逐行核在该用例块内，多一行或不在块内即命中）；新增 `\.skip\(|\.only\(|@ts-ignore|@ts-nocheck`；`# tests` < 147。
2. 守卫被关：断言型命令后新增 `|| true`；新增空 `catch`；`assertTrustedNetworkRequest` / `assertAllowedQuery` / `assertAllowedKeys` 被绕过或删调用；CHECK 子句被删。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D15/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `cli/**` `web/src/App.tsx` `web/src/api.ts` `README*` `package*.json` 改动 = 命中，本议题无豁免。
5. 验证被替代：新增测试 `mock|stub` 了 `database` 或 `EventHub`；迁移用例没有真的预建旧表（只是起两次服务）；冒烟用了 fixture 库而非临时空库。

## 补充打点（两轴没覆盖的，逐条取值）

1. **折叠目标取最新**：对 47998 造两行同任务未读（先 agent `in_review` 得 1 行，PATCH 它 `unread` 不变，再用 `?state=all` 确认只有 1 行；然后 PATCH `read` 再 PATCH `unread` 让它回未读，再 agent 评论）→ 折进的是那一行还是新开行？取值贴上（议题定义：折进「created_at 最新的未读未归档行」，任一结果都按定义判）。
2. **事务原子**：agent 用过期 version PATCH `in_review` → 409，随后 `GET /api/inbox` 行数与 `collapsedCount` 都不变（折叠 UPDATE 没在失败事务外落盘）。
3. **user 事件不触发折叠**：任务已有未读行时 user PATCH `blocked` → 行数、`collapsedCount`、`severity` 都不变。
4. **归档行不参与**：PATCH `archived` 后 agent 评论 → 新行 `collapsedCount` 1，`?state=all` 2 行。
5. **SSE payload**：折叠时 `inbox.updated` 的 data 顶层含 `projectId` / `taskId` / `item` / `task`，`item.collapsedCount` ≥ 2；PATCH read 的 `inbox.updated` 仍是 `{ item }` 形状（既有）。抓包核。
6. **diff 体积与分层**：`git diff --stat $base..HEAD` 原样贴；`server/database.mjs` 净增 ≤ 60、`server/app.mjs` 净减或 ≤ +10（三处 emit 收成 helper 应接近零和）；`InboxView.tsx` 是否零 fetch。

另核：恰 1 个 commit 且 pathspec 内（`git diff-tree -r --numstat --no-commit-id HEAD` 每行路径在议题允许的 7 个文件内）· 未 push · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D15 R1-VERDICT (#15)" -- docs/research/D15/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D15/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 用完杀掉。6. 🔴 判退出码不用管道；判字面串 `grep -F`；别把命令存进变量再 `$VAR` 展开（zsh 不分词）。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d15-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D15/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d15-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 6 条各一句判定 + 补充打点 6 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
