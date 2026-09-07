PASS
reviewedHead: 43ca6016781b9d64895dbd533fccda28cf333a8e
fixedPoint: 89ad991293979c8f3f38d24da445b08837f33752
diffCommand: git diff 89ad991293979c8f3f38d24da445b08837f33752..43ca6016781b9d64895dbd533fccda28cf333a8e
commits: 43ca601 feat(web): command palette with Cmd/Ctrl+K for issues, projects and views (#19)
implReport: /Users/happy/projects/taskboard/.scratch/d19-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/19 （验收 6 + Out of scope 4；comments 空；⑤ 勘误 `/health`）
conclusion: 逐条核过（①–⑤ 命令与取值均为本席亲跑，端口 47998；⑥ 为本席 VERDICT；补充打点 1–7 亲跑，7 为 Orca 内嵌浏览器；逃避清单对 `89ad991..43ca601` 机械核；未改交付物、未 push；未碰 47823 与主仓 `.data/`，无活库副本）

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 4 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

Standards 轴 1 条硬违反（impl report 若干字面 `grep` 未 `-F`，§3；本席 `grep -c -F` 计数相同）+ 0 条产品级。Spec 轴 0 条 finding。不选总赢家。

## Standards 轴

汇总：`CommandPalette` 纯展示（零 fetch、零 `window.addEventListener`，键盘只在 input `onKeyDown`）；`paletteGroups` 一个 `useMemo`、deps 与议题逐字相同；`handleShortcut` 既有四条一字不动，Cmd/Ctrl+K 放在 `isTyping` 之前（议题原句）；三种动作分别调用 `setBoardView` / `setSelectedProjectId` / `openTaskDetail`；样式只复用既有变量与既有 backdrop 规则；`selectableIndex` 跨组连续。report 退出码无管道。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run typecheck > log 2>&1; e=$?`、`npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d19r.log 2>&1; e=$?` → **0**；`npm run typecheck > /tmp/typecheck-d19r.log 2>&1; e=$?` → **0**；`npm run build > /tmp/build-d19r.log 2>&1; echo "build e=$?"` → **0**；`npm run check > /tmp/check-d19r.log 2>&1; e=$?` → **0**，`ℹ tests 152` / `ℹ pass 152` / `ℹ fail 0`，vitest `Tests  20 passed (20)`，与 report 一致。新哨兵/变异：不适用。 |
| §3 本机工具陷阱 | 违反（report 字面 grep 部分无 `-F`）；本席重跑符合 | report ① `grep -c 'fetch('`、② `grep -c 'matchesTaskSearch('`、`awk … \| grep -c '"k"'`、③ `grep -c 'CommandPalette.test.tsx'` 未 `-F`（ugrep 下 `$` 会锚；这些针无 `$`，本席 `grep -c -F` 同值：fetch **0** / matchesTaskSearch HEAD **3** base **2** / `"k"` **1** / package.json **1**）。四个键名用 `grep -cE` 是正则，正确。无 awk `==` 对非 ASCII、无 `ps \| grep`、无 `pgrep -f` 等待环。冒烟无嵌套引号 f-string。 |
| §6 测试与断言 | 符合 | 六用例真 `render`（`CommandPalette.test.tsx:43-47` helper，`grep -c -F 'vi.mock'` → **0**）。期望为字面量：`toHaveBeenCalledWith(0)` / `(2)`（`:74` `:79`）、`toHaveBeenCalledWith(projectItem)`（`:86`）、`toHaveBeenCalledWith("in")`（`:102`）、`not.toHaveBeenCalled()`（`:111`）；Escape 是议题要求的 `toHaveBeenCalledTimes(1)`（`:93`）。`aria-selected` 数组字面 `["false","true","false"]`（`:64-68`）。无 `.skip(` / `.only(` / `@ts-ignore` / `@ts-nocheck`。 |
| CommandPalette 纯展示 | 符合 | `grep -c -F 'fetch('` → **0**；`grep -c -F 'window.addEventListener'` → **0**。键盘只在 `<input onKeyDown={handleKeyDown}>`（`:81`，`:40-60`）。backdrop 点击 `event.target === event.currentTarget` 才 `onClose`（`:62-64`）。 |
| App 三组 useMemo / deps | 符合 | `paletteGroups` 单一 `useMemo`（`:733-780`），deps `[paletteQuery, projects, tasks, language, text]`（`:780`）与议题逐字相同。视图 6 项、项目含 `__all__`、议题 `q ? … : []`。 |
| handleShortcut 既有四条 | 符合 | `git diff 89ad991..HEAD -- web/src/App.tsx \| grep -E '^-' \| grep -vE '^---' \| grep -cE 'key\|metaKey\|ctrlKey'` → **0**。删除行仅 deps 数组（无 key 字面）。base 的 Cmd/Ctrl+Z / `c` / `/` / Esc 关详情条件与动作与 HEAD 逐字相同；只在 Z 前插入 K 段、在 `isTyping` 守卫前插入 palette Esc。deps 补 `paletteOpen`（`:1270`）。议题原句：「在输入框里也生效（放在 `isTyping` 守卫之前，照 Cmd+Z 那段）。」 |
| 执行动作复用 | 符合 | `handlePaletteSelect`（`:786-799`）：`setBoardView(item.id.slice("view:".length) as BoardView)`（`:788`）；`project:__all__` → `setSelectedProjectId(ALL_PROJECTS_ID)`（`:790`）；其它 project → `setSelectedProjectId(…)`（`:792`）；task → `tasks.find` 后 `openTaskDetail(task)`（`:794-795`）。未复制 `openTaskDetail` / `selectBoardView` 内部。 |
| 样式只用现有 CSS 变量 | 符合 | 新增 `.command-palette*` 只用 `var(--border-hairline/--border-strong/--surface-raised/--text-primary/--dialog-shadow/--border/--text-tertiary/--surface-hover)`。backdrop 挂到既有 `.delete-backdrop` 选择器（`styles.css:5108-5117`），`z-index: 80` > `.header-project-menu` 的 `50`（`:764`）。two-dot 新增行无新 hex / 新 `rgba(`。 |
| selectableIndex 跨组同形 | 符合 | 渲染期 `let selectableIndex = 0` 跨组累加（`CommandPalette.tsx:66,90`），`aria-selected={itemIndex === activeIndex}`。`ComposerCompletionMenu` 把 `selectableIndex` 放在 option 上（`:15,136`）。编号语义同形（跨组连续）；空组 `items.length > 0` 才渲染（`:86`），与 completion 菜单跳过空组同形。 |
| Fowler 味道 | 判断调用，非硬违反 | 非 Duplicated Code：页签文案六串与面板视图项同 `text(...)` 是议题「页签同文案」。非 Shotgun Surgery（允许的 5 文件）。非 Speculative Generality（无 cmdk、无历史、无注册表）。`handlePaletteSelect` / `handleKeyDown` 未过长。 |

Worst within Standards: report 字面 `grep` 未一律 `-F`（§3）。计数仍可信。无产品缺陷。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `89ad991..43ca601`（审查开始时实现 commit 恰 1）。任务书 baseSha `cad5e45` 是写单时 main；实际 merge-base 是 `89ad991293979c8f3f38d24da445b08837f33752`。`git merge-base --is-ancestor cad5e457619c6ca800c70a1e1a496f7d11221270 HEAD` e=0。two-dot 只有允许的 5 文件。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 组件 | 做到 | `grep -c -F 'data-testid="command-palette-input"'` → **1**。`grep -c -F 'data-testid="command-palette-item"'` → **1**（≥1）。`grep -c -F 'role="dialog"'` → **1**。`grep -cE '"(ArrowDown\|ArrowUp\|Enter\|Escape)"'` → **4**（≥4）。`grep -c 'fetch('` 与 `grep -c -F` 均 **0**。文件存在，117 行。 |
| ② App 接线 | 做到 | `grep -c -F '<CommandPalette'` → **1**。`awk '/function handleShortcut/,/window.addEventListener\("keydown", handleShortcut\)/' web/src/App.tsx \| grep -c '"k"'` 与 `grep -c -F '"k"'` 均 **1**（≥1）。`kind: "view"` **6**、`kind: "project"` **2**、`kind: "task"` **1**（均 ≥1）。`matchesTaskSearch(` HEAD **3** / base **2**（+1）。`text("没有匹配项", "No matches")` → **1**。 |
| ③ 六个组件用例 | 做到 | `grep -cE '^\s*(test\|it)\('` → **6**。六串各 `grep -c -F` → 各 **1**。`grep -c 'CommandPalette.test.tsx' package.json` 与 `-F` 均 **1**。`git diff 89ad991..HEAD -- package.json \| grep -cE '^[-+] '` → **2**。用例体：ArrowDown 断言参数 `0`/`2` 不是只「被调用」；Enter 断言 `projectItem` 对象；typing 断言 `"in"`；empty 断言 `onSelect` 未被调用。`npm run check` 中 `CommandPalette.test.tsx (6 tests)` 全过。 |
| ④ 回归 | 做到 | `npm run typecheck` e=**0**；`npm run build` e=**0**；`npm run check` e=**0**。`ℹ tests 152` / `ℹ pass 152` / `ℹ fail 0`；vitest `Tests  20 passed (20)`（≥20；6+5+9）。`git diff 89ad991..HEAD -- test/ web/src/components/*.test.tsx \| grep -cE '^-\s*(test\|it)\('` → **0**。`git diff 89ad991..HEAD --stat -- server/ cli/ shared/ test/ docs/ README.md README.zh-CN.md package-lock.json web/src/api.ts web/src/types.ts web/src/taskFilters.ts \| wc -l` → **0**。 |
| ⑤ 冒烟 | 做到 | 改端口 **47998**（审查席），临时 `DATA_DIR`，无活库副本。`npm run build` e=**0**。`grep -c -F 'command-palette-input' dist/web/assets/*.js \| grep -v ':0' \| wc -l` → **1**（`dist/web/assets/index-DmsZgLau.js:1`）。`curl` `http://127.0.0.1:47998/` → **index 200**；`/health` → `{"status":"ok"}`；`GET /api/inbox` → **inbox 200**；index `grep -c -F 'assets/'` → **3**。47823 pid **58806** 仍 LISTEN；47998 pid **74291** 用完已杀。 |
| ⑥ 审查 | 做到 | 本文件头行 **PASS**；S3 不触发。实现 report ⑥ 标 `NOT VERIFIED: 真浏览器交互` 正确（实现席非必修）；本席补了内嵌浏览器打点（补充 7）。 |

Out of scope：

- 不引 cmdk 或任何依赖（`package-lock.json` two-dot `wc -l` **0**；`package.json` 只改 `test:components` 一行，`^[-+] ` = **2**）；不做模糊评分（`includes` / `matchesTaskSearch`）；不做最近使用 / 历史。没做错。
- 不做快捷键注册表；既有 `/`、`c`、Cmd+Z、Esc 关详情条件与动作一字不动（快捷键删除行含 `key|metaKey|ctrlKey` = **0**）；面板自身不加 URL 状态（Enter 走既有 `openTaskDetail` 写 `?project=&issue=`，不是新路由）。没做错。
- 不动 `server/**`、`cli/**`、`shared/**`、`test/**`、`web/src/api.ts`、`web/src/types.ts`、`web/src/taskFilters.ts`、`docs/**`（实现 diff）、`README*`：越界 pathspec `wc -l` **0**。没做错。
- 不重起 47823、不碰主仓 `.data/`：本席未碰 47823（pid **58806** 仍 LISTEN）；未用活库副本；47998 用完已杀。没做错。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `89ad991..43ca601`）：

1. 断言删除：`--diff-filter=D -- test/` 空。`git diff … -- test/ web/src/components/*.test.tsx` 删除行含 `assert|expect`：**none**。`grep -cE '^-\s*(test|it)\('` → **0**。InboxView / MarkdownDocument test two-dot 空。新增 `\.skip\(|\.only\(|@ts-ignore|@ts-nocheck`：空。`# tests` = **152**（不 < 152）。vitest **20**（不 < 20）。未命中。
2. 守卫：diff 无新增 `|| true`、无新增空 `catch`。`isTyping` 仍在 `handleShortcut`（定义 + Cmd+Z `!isTyping` + `if (isTyping \|\| contextMenu \|\| projectMenuOpen) return`，awk 区间 `grep -c -F 'isTyping'` → **3**）。Cmd+K 段在守卫之前是议题明文：「在输入框里也生效（放在 `isTyping` 守卫之前，照 Cmd+Z 那段）。」未命中。
3. 门禁：commit message 与 diff 无 `--no-verify` / `--force`。`git log … \| grep -cE '\-\-no-verify|\-\-force'` → **0**。未命中。
4. 判据：`docs/briefs/**` `docs/agents/**` `docs/research/**`（实现 diff）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `server/**` `cli/**` `test/**` `web/src/api.ts` `web/src/types.ts` `web/src/taskFilters.ts` `web/src/i18n.tsx` `package-lock.json` 无 diff。`package.json` 除 `test:components` 一行外无改动。未命中。
5. 验证替代：`CommandPalette.test.tsx` 无 `vi.mock`，helper 真 `render(<CommandPalette />)`。冒烟本席先 `npm run build` e=0 再 curl。未命中。

清单 5 项全 0。

其它：

1. **空 query 不列议题**：`taskItems` 在 `q` 为空时为 `[]`（`App.tsx:763-773`）。`return` 仍含 `{ id: "tasks", label: text("议题", "Issues"), items: taskItems }`（`:775-779`），空组仍进数组。组件 `:86` `group.items.length > 0 &&` 才渲染，空 query UI 不列议题组。浏览器空 query 快照只有「视图」「项目」，无「议题」。产品「不列议题」成立；机械「不进数组」未严格满足。
2. **上限 20**：`App.tsx:766` `.slice(0, 20)`。
3. **动作对象**：`App.tsx:794-795` `const task = tasks.find((candidate) => candidate.id === item.id.slice("task:".length)); if (task) openTaskDetail(task);` ——传 `tasks` 里的真对象（含 `identifier` / `projectId`）。浏览器 Enter 后 URL `http://127.0.0.1:47998/?project=local&issue=LOCAL-1`。
4. **索引复位**：`App.tsx:782-784` `useEffect(() => { setPaletteIndex(0); }, [paletteQuery]);`。
5. **快捷键守卫**：`git diff 89ad991..HEAD -- web/src/App.tsx \| grep -E '^-' \| grep -vE '^---' \| grep -cE 'key\|metaKey\|ctrlKey'` → **0**（deps 数组那一行被改但不含这些字面，不算 1）。
6. **diff 体积**：`git diff --stat 89ad991..HEAD` 原文：
   ```
    package.json                               |   2 +-
    web/src/App.tsx                            | 102 ++++++++++++++++++++++++-
    web/src/components/CommandPalette.test.tsx | 113 ++++++++++++++++++++++++++++
    web/src/components/CommandPalette.tsx      | 117 +++++++++++++++++++++++++++++
    web/src/styles.css                         |  85 ++++++++++++++++++++-
    5 files changed, 416 insertions(+), 3 deletions(-)
   ```
   `git diff --numstat`：App.tsx `101 1` 净增 **100** ≤ 110；styles.css `84 1` 净增 **83** ≤ 90；`CommandPalette.tsx` **117** 行 ≤ 160。未超。
7. **真浏览器**：`orca tab create --url http://127.0.0.1:47998/`（page `ee70f698-…`）。空 query 面板：分组「视图」六项（项目文档 / 仪表盘 / 收件箱 / 议题看板 / 列表视图 / 甘特图）+「项目」（全部项目、全局 hint=local），无「议题」。造 `LOCAL-1 inbox regression` 后把 input 设为 `in`：只剩「议题」组，行 `LOCAL-1 inbox regression` hint「待立项」。ArrowDown 单行仍 selected。Enter（对 input 派 `keydown Enter`）→ 面板关、详情开，origin `?project=local&issue=LOCAL-1`，region「LOCAL-1 议题详情」，标题 inbox regression。面板 Esc 由 jsdom「Escape closes the palette」覆盖；详情在标题 textbox 聚焦时 Esc 不关（既有 `isTyping` 守卫，非本卡引入）。

另核：审查开始时 `git rev-list --count 89ad991..HEAD` = **1**；`git diff-tree -r --numstat --no-commit-id HEAD` 原文：
```
1	1	package.json
101	1	web/src/App.tsx
113	0	web/src/components/CommandPalette.test.tsx
117	0	web/src/components/CommandPalette.tsx
84	1	web/src/styles.css
```
`wc -l` = **5**，每行路径均在议题允许的 5 个文件内。`git ls-remote --heads origin spec/19` 空、`git branch -r --list 'origin/spec/19'` 空（未 push）。`git log --format=%b 89ad991..43ca601 | grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --summary` 0 行。

## 局限

- impl report ①②③ 若干字面 `grep` 未 `-F`（Standards §3）；议题原文部分即无 `-F`，针无 `$`，本席 `grep -F` 计数相同。建议级。
- 空 query 时 `paletteGroups` 仍把 `id: "tasks"` 空组放进数组（`App.tsx:775-779`）；UI 因 `items.length > 0` 不渲染。产品行为正确，机械「不进数组」未严扣。建议级。
- 页签走 `selectBoardView`（关菜单并写入 `PROJECT_VIEW_KEY`），面板按议题明文走 `setBoardView`，不落盘、不关 gantt 菜单。议题要求复用 `setBoardView`。建议级。
- 全部项目时页签不展示「项目文档」，面板仍列出并可切到 `readme`。议题要求六个 `BoardView`。建议级。
- 全局 `handleShortcut` 的 Esc 只 `setPaletteOpen(false)` 不清 `paletteQuery`；输入框 Esc 走 `onClose` 会清。Cmd+K 切换关闭也不清 query。输入框聚焦时两条都会跑。建议级。
- agent-browser `press Meta+k` / `press Enter` 未把组合键稳定打进 React；本席用 `keydown` 派发（`metaKey:true` 的 `k`、input 上的 `Enter`）才看到面板开关与详情。jsdom 六用例覆盖键盘。不构成产品缺陷。
- 未测 21 条议题截断、中英切换下的 label 过滤、IME。上限代码为 `.slice(0, 20)`。
