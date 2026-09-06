# D9 · 跨家审查（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/9>（`gh issue view 9 --comments`）——Spec 轴的判据真源是它的「验收」8 条与「Out of scope」5 条。**

席位：`grok`（实现者是 `codex-sol`，跨家）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d9-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审法 = 同一份 `~/.agents/skills/code-review/SKILL.md` 两轴，对象 `git diff $(git merge-base origin/main HEAD)..HEAD`，报告头按其产出格式，含 reviewedHead。

先在工位 `npm install > /tmp/npm-d9r.log 2>&1; e=$?`（约 1 分钟）再跑任何验证。

## 两轴分开判，不跨轴排名

**Standards 轴**：本仓无 CODING_STANDARDS.md，对 `/Users/happy/projects/orca-lab/CODING_STANDARDS.md` §2（验证）、§3（本机工具陷阱）、§6（测试与断言）逐条判 report 里的取值方式。代码层另看：写入规则是否落在 `updateTask` / `createComment` 内部或紧随其后（不是在路由层重新推断状态）；`inbox_items` 的 CHECK 与索引是否与议题①逐字；是否把逻辑塞进 `App.tsx` 而不是 `InboxView`；是否引入新依赖；重复、过长函数、散弹式修改、猜测性抽象（Fowler 味道基线）。每条写「符合 / 违反 / 不适用」，违反的给 `file:line` 与你自己跑的命令。

**Spec 轴**：逐条对议题「验收」8 条，判「做到 / 半做 / 没做 / 做错」，每条给出你自己跑的命令与结果（①③④⑤⑥⑦ 的 grep / wc 判据逐字跑；②的六个字面串各 `grep -c -F`；⑦ 的 `npm run check` 亲跑取尾三数与 vitest 行；⑧ 冒烟 8 步**亲跑一遍**（端口 47998，别用 47999 免得撞实现席残留），活库副本段也跑）。先把条数写在 verdict 开头。Out of scope 5 条做了也算做错（尤其：加了 `taskctl inbox`、user 触发写了收件箱、改了既有事件名 / 路由 / 枚举、动了 `shared/` `cli/` `docs/`、`package-lock.json` 有 diff、`package.json` 改了 `test:components` 以外的行）。

两轴各一句汇总，不选总赢家。

**定级**：产品行为缺陷（服务起不来、写入规则错、user 操作进了收件箱、GET/PATCH/read-all 任一形状或错误码不对、SSE 不发、收件箱视图打不开、既有用例掉、事件名数 ≠ 17）= 必修；文案、样式、命名、summary 措辞、按钮位置 = 建议级，写进「局限」。

**逃避与拧松清单（机械核，先于两轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求该改动，VERDICT 里引原句）**：对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 断言被删或放宽：`test/**`、`MarkdownDocument.test.tsx` 删除行含 `assert|expect`；新增 `\.skip\(|\.only\(|@ts-ignore|@ts-nocheck`；`# tests` < 129。
2. 守卫被关：断言型命令后新增 `|| true`；新增空 `catch`；`assertTrustedNetworkRequest` / `assertAllowedQuery` / `assertAllowedKeys` 被绕过或删调用。
3. 门禁被绕：`--no-verify|--force`。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（除本席自己的 `docs/research/D9/`）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `cli/**` 改动 = 命中，本议题无豁免。
5. 验证被替代：新增测试 `mock|stub` 了 `database` 或 `EventHub`（写入规则与 SSE 必须经真实 `createTaskboardServer` 判定链）；冒烟用了 fixture 库而非临时空库。

## 补充打点（两轴没覆盖的，逐条取值）

1. **user 负例经过真判定链**：`test/inbox.test.mjs` 里 `user in_review -> none` 那条是否真的用无 agent 头的 PATCH 打到服务器再 GET `/api/inbox` 断言 `unreadCount` 不变（不是断言某函数没被调用）。
2. **归档即已读**：PATCH `archived` 后 `readAt` 与 `archivedAt` 都非 null；再 `unread` 两者都清。自己 curl 一遍。
3. **级联删除**：删任务（`DELETE /api/tasks/:id`）后其 inbox 条目消失（`?state=all` 不再含），且 `GET /api/inbox` 不 500（`taskTitle` join 对已删任务的处理）。自己跑。
4. **Host/Origin 对新路由生效**：`curl -X PATCH http://127.0.0.1:47998/api/inbox/x -H 'Origin: https://evil.example' -H 'content-type: application/json' -d '{"state":"read"}'` → 403 `INVALID_ORIGIN`（先于 404）。
5. **SSE payload 形状**：`inbox.item.created` 的 data 含 `projectId` / `taskId` 顶层键（`EventHub.emit` 自动补的那两个）与 `item`；`inbox.updated` 的 data 有 `item` 或 `updated`。抓包核。
6. **前端体积与分层**：`git diff --stat $base..HEAD -- web/src/App.tsx` 的增量行数原样贴；`InboxView.tsx` 是否零 fetch（数据由 App 传入）。

另核：恰 1 个 commit 且 pathspec 无越界（`git show --stat HEAD` 外来文件 0）· 未 push · `git diff $base..HEAD -- package-lock.json | wc -l` = 0 · `git log --format=%b $base..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D9 R1-VERDICT (#9)" -- docs/research/D9/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**。2. 🔴 禁 `git push`。3. 🔴 产物 = `docs/research/D9/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Standards 轴 → Spec 轴 → 补充打点 → 局限」四节写。4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。5. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`；不碰 47823 与主仓 `.data/`；自己起的 47998 用完杀掉。6. 🔴 判退出码不用管道；判字面串 `grep -F`。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d9-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D9/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d9-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：两轴各一句汇总 + 验收 8 条各一句判定 + 补充打点 6 项取值 + 逃避清单 5 项取值 + 产物路径 + commit sha。
