PASS
reviewedHead: 4a62877fc3d9da55f9c1c6d528121e85eec161fc
fixedPoint: 0762cfdeec6ba53f055b02766af51ce23ecf1b40
diffCommand: git diff 0762cfdeec6ba53f055b02766af51ce23ecf1b40..4a62877fc3d9da55f9c1c6d528121e85eec161fc
commits: 4a62877 fix(web): persist board view chosen from the command palette via selectBoardView (#27)
implReport: /Users/happy/projects/taskboard/.scratch/d27-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/27 （验收 5 + Out of scope 4；comments 空）
conclusion: 逐条核过（逃避清单先于两轴；①② 的 grep / awk / diff 判据本席亲跑；③ `npm run typecheck` / `npm run build` / `npm run check > /tmp/d27r-check.log 2>&1; e=$?` 亲跑取尾三数 158/158/0 与 vitest 26 + 冻结面零 diff；④ 真浏览器 47998 亲做，对照基线 47997 亦做；⑤ 为本席 VERDICT；未改交付物、未 push；未碰 47823 pid 41957 与主仓 `.data/` mtime 1788700980）

验收 5 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到。Out of scope 4 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

Standards 轴 1 条硬违反（impl report 若干字面 `grep` 未 `-F`，§3；本席 `grep -F` 计数相同）+ 0 条产品级。Spec 轴 0 条 finding。不选总赢家。

## Standards 轴

汇总：two-dot 恰一删一增、只换函数名；`selectBoardView` 是函数声明（调用在 `:795` 之后、`:1343` 靠提升可用，不是 `const` 箭头）；`openInboxTask` / 面板其它分支 / 定义零 diff。report 退出码无管道。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run typecheck > /tmp/tc.log 2>&1; e=$?`、`npm run build > /tmp/build.log 2>&1; e=$?`、`npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d27r.log 2>&1; e=$?` → **0**；`npm run typecheck > /tmp/d27r-typecheck.log 2>&1; e=$?` → **0**；`npm run build > /tmp/d27r-build.log 2>&1; e=$?` → **0**（`✓ built in 377ms`；`dist/web/index.html` 722 字节存在）；`npm run check > /tmp/d27r-check.log 2>&1; e=$?` → **0**，`ℹ tests 158` / `ℹ pass 158` / `ℹ fail 0`，vitest `Tests  26 passed (26)`。完成态用 log 内容，不是回执。 |
| §3 本机工具陷阱 | 违反（report 若干字面无 `-F`）；本席重跑符合 | report ① `grep -c 'selectBoardView('` / `grep -c 'setBoardView('`、awk 后 `grep -c 'selectBoardView('`、另核 `grep -ci co-authored` 未一律 `-F`（议题原文部分即此针；针无中间 `$`，ugrep 下计数仍可信）。精确行与 `function selectBoardView` 用了 `-F`。本席 `grep -c -F 'selectBoardView('` **8**、`grep -c -F 'setBoardView('` **6**，与无 `-F` 同值。无 awk `==` 对非 ASCII、无 `ps \| grep`、无 `pgrep -f` 等待环。冒烟无嵌套引号 f-string。 |
| §6 测试与断言 | 不适用（新测）；既有断言面符合 | 未增测试、未改 `test/**` 或 `web/src/**/*.test.ts*`。既有 `# tests` **158**、vitest **26**。无 `.skip(` / `.only(` / `@ts-ignore` / `@ts-nocheck`。议题明文不加测试文件。 |
| 恰一删一增只换函数名 | 符合 | `git diff 0762cfdeec6ba53f055b02766af51ce23ecf1b40..HEAD` 唯一 hunk `:794`。`grep -E '^[-+][^-+]' \| sed -E 's/^[-+]//'` 两行：`setBoardView(item.id.slice("view:".length) as BoardView);` 与 `selectBoardView(item.id.slice("view:".length) as BoardView);`（缩进 / 参数 / `as BoardView` / 分号未动）。`sort -u \| wc -l` = **2**；`s/selectBoardView/setBoardView/` 后 `sort -u \| wc -l` = **1**。 |
| `selectBoardView` 定义形态 | 符合 | `grep -c '^  function selectBoardView(view: BoardView) {' web/src/App.tsx` = **1**。`grep -n 'function handlePaletteSelect\|function selectBoardView' web/src/App.tsx` → `795:  function handlePaletteSelect` / `1343:  function selectBoardView`（调用在前、声明在后，提升可用）。不是 `const` 箭头，无 TDZ。定义体 HEAD 与 base 逐字相同（`:1343-1350`）。 |
| 没有顺手改别的 | 符合 | two-dot name-only 恰 `web/src/App.tsx`。`openInboxTask` `:827-828` HEAD 与 base 均为 `setBoardView("issues")` + 手写落盘。`CommandPalette.tsx` / `CommandPalette.test.tsx` two-dot 空。 |
| Fowler 味道 | 判断调用，非硬违反 | 非 Shotgun Surgery（1 文件 1 行）。非 Speculative Generality。既有 `selectBoardView` 包一层 `setBoardView` 是原状 Middle Man，本 diff 未引入。 |

Worst within Standards: report 字面 `grep` 未一律 `-F`（§3）。计数仍可信。无产品缺陷。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `0762cfdeec6ba53f055b02766af51ce23ecf1b40..4a62877fc3d9da55f9c1c6d528121e85eec161fc`（审查开始时实现 commit 恰 1）。议题 baseSha `22752ed` 是写单时 main；实际 merge-base 是 briefs commit `0762cfd`（含 D27 两单）。`git merge-base --is-ancestor 22752ed HEAD` e=0。two-dot 只有 `web/src/App.tsx`。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 恰一行替换 | 做到 | `grep -c -F 'selectBoardView(item.id.slice("view:".length) as BoardView);' web/src/App.tsx` = **1**。`grep -c -F 'setBoardView(item.id.slice("view:".length) as BoardView);'` = **0**。`grep -c 'selectBoardView('` = **8**。`grep -c 'setBoardView('` = **6**。`awk '/function handlePaletteSelect/,/setPaletteQuery\(""\);/' web/src/App.tsx \| grep -c 'selectBoardView('` = **1**。位点 `App.tsx:797`。 |
| ② diff 体积 | 做到 | `git diff --numstat 0762cfdeec6ba53f055b02766af51ce23ecf1b40..HEAD` python repr = `'1\t1\tweb/src/App.tsx\n'`。`git diff --name-only` 恰 `web/src/App.tsx`。`grep -cE '^[-+][^-+]'` = **2**。`grep -c '^@@'` = **1**。`grep -c -F 'function selectBoardView'` = **0**。 |
| ③ 回归 | 做到 | `npm run typecheck` e=**0**；`npm run build` e=**0**；`npm run check > /tmp/d27r-check.log 2>&1; e=$?` → **0**（check 脚本含 knip：`typecheck && knip && build && test`；`grep -c -F Unused /tmp/d27r-check.log` = **0**）。Node 尾三数：`ℹ tests 158` / `ℹ pass 158` / `ℹ fail 0`。vitest：`Tests  26 passed (26)`。`git diff --stat 0762cfdeec6ba53f055b02766af51ce23ecf1b40..HEAD -- server/ cli/ shared/ test/ docs/ README.md README.zh-CN.md package.json package-lock.json knip.json web/src/components/ \| wc -l` = **0**。 |
| ④ 行为冒烟 | 做到 | 见补充打点 1。47998 临时 DATA_DIR，Orca 内嵌浏览器 isolated profile。`(a)` 键 `null`、`aria-pressed="true"` =「议题看板」；`(b)` 面板选「甘特图」→ 面板关、页签「甘特图」、键 `"gantt"`；`(c)` `orca reload` 后页签仍「甘特图」、键仍 `"gantt"`（未回弹议题看板）；`(d)` 面板选「收件箱」→ 键 `"inbox"`。甘特菜单开着时再走面板切「议题看板」，菜单关。对照基线 47997 同一 `(b)(c)`：`(b)` 页签「甘特图」但键仍 `null`；`(c)` 回弹「议题看板」、键仍 `null`。 |
| ⑤ 审查 | 做到 | 本文件头行 **PASS**；S3 不触发。实现 report ⑥ 标 `NOT VERIFIED: 真浏览器` 正确（改由本席做）。 |

Out of scope：

- 不动 `selectBoardView` 定义；不动 `openInboxTask` 的手写落盘（`:827-828`）；不给 `ALL_PROJECTS_ID` 加特例：diff 无定义、无 `openInboxTask`；`:827-828` HEAD 与 base 逐字相同。没做错。
- 不动 `CommandPalette.tsx` / `CommandPalette.test.tsx`；不加测试文件：two-dot 空。没做错。
- 不动 `server/**`、`cli/**`、`shared/**`、`test/**`、`docs/**`、`README*`、`package*.json`、`knip.json`：冻结面 `wc -l` = **0**（本席 VERDICT 在 `docs/research/D27/`，不计入实现 diff）。没做错。
- 不重起 47823：审查前后 pid **41957** 仍 LISTEN；主仓 `.data/taskboard.sqlite` mtime 均为 `1788700980`。没做错。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `0762cfdeec6ba53f055b02766af51ce23ecf1b40..4a62877fc3d9da55f9c1c6d528121e85eec161fc`）：

1. 断言被删或放宽：`git diff --name-only … -- test/ 'web/src/**/*.test.ts*'` 空。`--diff-filter=D -- test/` 空。`# tests` = **158**。vitest **26**。无 `.skip(` / `.only(`。未命中。
2. 守卫被关：diff 无新增 `|| true`、无空 `catch`、无 `as any`、无 `// @ts-`。`package.json` two-dot 空。未命中。
3. 门禁被绕：commit message 与 diff 无 `--no-verify` / `--force`。`git log --format='%s%n%b' 0762cfdeec6ba53f055b02766af51ce23ecf1b40..HEAD \| grep -cE -- '--no-verify\|--force'` → **0**。未命中。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（实现 diff）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `server/**` `cli/**` `shared/**` `test/**` `web/src/components/**` `README*` `knip.json` 无 diff。未命中。
5. 验证被替代：report 「check e=0」用 `npm run check > /tmp/check.log 2>&1; e=$?`。①② 取值已贴且与本席亲跑一致（1 / 0 / 8 / 6 / 1；numstat `1	1	web/src/App.tsx`；`^[-+][^-+]` 2；`^@@` 1；定义 0）。未命中。

清单 5 项全 0。

其它：

1. **真浏览器（议题 ④）**：`npm run build` 后 `D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47998 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &`（DATA_DIR `/var/folders/sq/y3rzl_9d4kn1724g6s9z1q280000gn/T/tmp.utCA7t95hz`，pid **2762**）。`curl` `/health` = `{"status":"ok"}`；`/` **200**；`/api/projects` **200**。`orca tab create --url http://127.0.0.1:47998/?project=local`（page `879a06a8-e998-4113-9f13-e6ce9426dbca`，isolated profile `d27-review`）。取值：
   - (a) `localStorage.getItem("taskboard.project-view.v1.local")` = **`null`**；`aria-pressed="true"` 页签 = **「议题看板」**。
   - (b) 关首用项目菜单后，对 `document.body` 派 `keydown` `key:"k"` `metaKey:true` 开面板（见局限）；点「甘特图」行 → 面板关、`aria-pressed="true"` = **「甘特图」**、键值 = **`"gantt"`**。`.gantt-view-menu` / `.context-menu` 均无。
   - (c) `orca reload` → 键值仍 **`"gantt"`**、`aria-pressed="true"` 仍 **「甘特图」**（未回弹「议题看板」）。
   - (d) 再开面板点「收件箱」→ 键值 **`"inbox"`**、页签 **「收件箱」**、面板关。
   - 额外：甘特页签下点「时间轴视图选项」→ `.gantt-view-menu` 开、`aria-expanded="true"`；面板切「议题看板」后 `.gantt-view-menu` **false**（菜单随 `selectBoardView` 关掉）。空项目无议题，右键菜单未另造。
   用完 `kill $(lsof -tiTCP:47998 -sTCP:LISTEN)` 并 `orca tab close`。
2. **对照基线**：`git worktree add /tmp/d27-base 0762cfdeec6ba53f055b02766af51ce23ecf1b40` → 该工位 `npm install` e=0 + `npm run build` e=0 → `TASKBOARD_PORT=47997` 临时 DATA_DIR（pid **14051**）。isolated profile `d27-base`，page `2665ea9e-4fb5-42f6-aba9-31f13881085d`，`http://127.0.0.1:47997/?project=local`。同一操作：(b) 页签 **「甘特图」** 但键值仍 **`null`**；(c) 刷新后页签回弹 **「议题看板」**、键值仍 **`null`**。证明本卡修的是真问题。用完杀 47997、`git worktree remove /tmp/d27-base` e=0、关 tab。
3. **只换函数名**：`git diff 0762cfdeec6ba53f055b02766af51ce23ecf1b40..HEAD \| grep -E '^[-+][^-+]' \| sed -E 's/^[-+]//' \| sort -u \| wc -l` = **2**；`s/selectBoardView/setBoardView/` 后再 `sort -u \| wc -l` = **1**。
4. **面板其它分支零 diff**：`git diff 0762cfdeec6ba53f055b02766af51ce23ecf1b40..HEAD \| grep -cE 'setSelectedProjectId|openTaskDetail|setPaletteOpen|setPaletteQuery'` = **1**（hunk 上下文下一行 `setSelectedProjectId(ALL_PROJECTS_ID);`，非改动行）。`grep -E '^[-+][^-+]'` 后再滤这些名字 = **none**。其它分支零改动。
5. **定义形态**：`grep -c '^  function selectBoardView(view: BoardView) {' web/src/App.tsx` = **1**。`grep -n 'function handlePaletteSelect\|function selectBoardView'` → **795** / **1343**。
6. **产物与服务**：`npm run build` 后 `dist/web/index.html` 存在（722 字节）。47998 `/` **200**、`/health` = `{"status":"ok"}`、`/api/projects` **200**。
7. **diff 体积**：`git diff --stat 0762cfdeec6ba53f055b02766af51ce23ecf1b40..HEAD` 原文：
   ```
    web/src/App.tsx | 2 +-
    1 file changed, 1 insertion(+), 1 deletion(-)
   ```

另核：审查开始时 `git rev-list --count 0762cfdeec6ba53f055b02766af51ce23ecf1b40..HEAD` = **1**；`git diff-tree -r --numstat --no-commit-id HEAD` python repr = `'1\t1\tweb/src/App.tsx\n'`。`git ls-remote --heads origin spec/27` 空、`git branch -r --list 'origin/spec/27'` 空（未 push）。`git log --format=%b 0762cfdeec6ba53f055b02766af51ce23ecf1b40..HEAD \| grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --summary` 0 行。

## 局限

- impl report ① 若干字面 `grep` 未一律 `-F`（Standards §3）；议题原文部分即无 `-F`，针无 `$`，本席 `grep -F` 计数相同。建议级。
- 补充打点 4 的整份 diff `grep -cE` 因 hunk 上下文命中 1；`+/-` 行 0。不是改了其它分支。建议级。
- 空项目无议题，未造右键菜单再走面板切视图。`selectBoardView` 仍先 `closeContextMenu()`；甘特菜单开着切走已亲见关闭。抽查未见产品差异。
- 内嵌浏览器 `orca keypress Meta+k` / `Control+k` 与对 `window` 派 `keydown` 未打开面板（`handleShortcut` 对非 Element 的 `event.target` 调 `matches` 会抛）。对 `document.body` 注入主世界 `keydown`（`metaKey:true` 的 `k`）后面板出现；点面板行用 `element.click()`。jsdom 六用例覆盖键盘。不构成产品缺陷。
- 新鲜 profile 首屏 `FIRST_USE_COMPLETE_KEY` 为空，项目菜单默认展开；点「切换项目」关上后再开面板。非本卡引入。
- 工位 `node --version` = v26.5.0。抽查未见产品差异。
- 未 `git push`。未改交付物。47998 / 47997 用完已杀；自己开的 tab 已关；`/tmp/d27-base` 已 `git worktree remove`。47823 pid **41957** 仍 LISTEN。
