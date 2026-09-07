PASS
reviewedHead: 139701c8ae4873338a4a6064e8dc177688775c67
fixedPoint: 581a849cb58e128004a7f4ccc8d664815900bb32
diffCommand: git diff 581a849cb58e128004a7f4ccc8d664815900bb32..139701c8ae4873338a4a6064e8dc177688775c67
commits: 139701c feat(board): nest and collapse same-column sub-issues under their parent (#23)
implReport: /Users/happy/projects/taskboard/.scratch/d23-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/23 （验收 6 + Out of scope 4；comments 空）
conclusion: 逐条核过（①–⑤ 命令与取值均为本席亲跑，端口 47998；⑥ 为本席 VERDICT；补充打点 1–7 亲跑，7 为 Orca 内嵌浏览器；逃避清单对 `581a849c..139701c8` 机械核；未改交付物、未 push；未碰 47823 与主仓 `.data/`，无活库副本，冒烟用 mktemp DATA_DIR）

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 4 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

Standards 轴 1 条硬违反（impl report ①②③ 若干字面 `grep` 未 `-F`，§3；本席 `grep -c -F` 计数相同）+ 0 条产品级。Spec 轴 0 条 finding。不选总赢家。

## Standards 轴

汇总：`groupColumnTasks` 纯函数、泛型只约束 `id` / `relations.parent.id`、无 React/`types` import、Map 预分组 O(n)；`BoardColumn` 只做 `tasks: columnTasks` 解构 + `const tasks = rows.map(...)` 重绑定 + 渲染循环改 `rows`，三个 Map 与全部含 `drag` 的行零删除；`TaskCard` 零 diff；App 只加 state + toggle + 两个 prop；样式只用现有变量。report 退出码无管道。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run typecheck > log 2>&1; e=$?`、`npm run build > log 2>&1; e=$?`、`npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。本席 `npm install > /tmp/npm-d23r.log 2>&1; e=$?` → **0**；`npm run typecheck > /tmp/d23r-typecheck.log 2>&1; e=$?` → **0**；`npm run build > /tmp/d23r-build.log 2>&1; e=$?` → **0**；`npm run check > /tmp/d23r-check.log 2>&1; e=$?` → **0**，`ℹ tests 158` / `ℹ pass 158` / `ℹ fail 0`，vitest `Tests  26 passed (26)`，与 report 一致。新哨兵/变异：不适用。 |
| §3 本机工具陷阱 | 违反（report 若干字面无 `-F`）；本席重跑符合 | report ① `export function groupColumnTasks`、`boardGrouping.test.tsx`、② `groupColumnTasks(`、`aria-expanded`、`个子任务`、③ `collapsedParents` 未一律 `-F`（议题原文部分即此针；六标题串 report 已 `-F`）。ugrep 下这些针无中间 `$`，计数仍可信。本席 `grep -c -F`：`export function groupColumnTasks` **1**、`groupColumnTasks(` **1**、`aria-expanded` **1**、`个子任务` **1**、`collapsedParents` App **3**、`boardGrouping.test.tsx` package.json **1**。无 awk `==` 对非 ASCII、无 `ps \| grep`、无 `pgrep -f` 等待环。冒烟 `python3 -c` 无嵌套引号 f-string。 |
| §6 测试与断言 | 符合 | 六用例真 import `groupColumnTasks`（`boardGrouping.test.tsx:2`），`grep -nE 'mock\|stub\|vi\.fn'` 空。期望为字面量：ids `["A","B","C"]` / `["P","c1","c2","X"]` / `["c","X"]` / `["P","c","g"]`（`:13,:23,:30,:37`）；depths `[0,0,0]` / `[0,1,1,0]` / `[0,0]` / `[0,1,0]`（`:14,:24,:31,:38`）；hidden `[false,true,true]`（`:47`）；`childCount` `2` / `0`（`:48,:57-58`）。断言的是行数组的顺序 / `depth` / `hidden` / `childCount`，不是只断言长度。无 `.skip(` / `.only(` / `@ts-ignore` / `@ts-nocheck`。 |
| 纯函数 / 泛型 | 符合 | `web/src/boardGrouping.ts` 无 `import` 行。签名 `:8-10` `T extends { id: string; relations: { parent: { id: string } \| null } }`。不读 React、不 import `types.ts`。无 `this`、不改输入数组 / Set。 |
| 算法 O(n) | 符合 | `:11-12` `ids` Set + `tasksById` Map 各一遍；`:22-31` `childrenByParent: Map<string, T[]>` 按输入序 push；`:34-46` 再扫一遍非嵌套行并接上预分组子数组。`isNested` / `parentOf` 每次 O(1) Map/Set 查找。不是每个父任务 `filter` 一遍。 |
| BoardColumn 接法 / drag 零删 | 符合 | 解构 `:61` `tasks: columnTasks`；`:90-91` `const rows = groupColumnTasks(columnTasks, collapsedParents); const tasks = rows.map((row) => row.task);`。三个 Map：`taskIndexes` `:96`、`remainingTasks` `:97`、`remainingIndexes` `:98`。`git diff 581a849c..HEAD -- web/src/components/BoardColumn.tsx \| grep -E '^-' \| grep -vE '^---' \| grep -ci drag` = **0**。`grep -ci drag` HEAD=**31** / base=**31**。删除行仅 5 行：`import { useEffect, useState }`、`tasks,`、`tasks.map((task)`、`return (`、`key={task.id}`，均不含 `drag`。 |
| TaskCard 零 diff | 符合 | `git diff 581a849c..HEAD --stat -- web/src/components/TaskCard.tsx \| wc -l` = **0**。`data-task-id` 仍在 `TaskCard.tsx:460`。 |
| App 范围 | 符合 | two-dot 新增仅：`:453` `useState<Set<string>>(() => new Set())`；`:454-461` `toggleCollapsedParent`；`:2481-2483` `collapsedParents={collapsedParents}`；`:2511` `onToggleCollapse={toggleCollapsedParent}`。`tasksByStatus` 定义不在 diff 内（HEAD `:1294`）。无 localStorage / sessionStorage。 |
| 样式只用现有变量 | 符合 | `.board-card-nested` 用 `var(--border-strong)`；`.subtask-toggle` 用 `var(--text-secondary)`。two-dot 新增行无新 hex / 新 `rgba(`。 |
| Fowler 味道 | 判断调用，非硬违反 | 非 Shotgun Surgery（允许的 6 文件）。非 Speculative Generality（无多层、无落盘、无「全部折叠」）。`groupColumnTasks` 49 行未过长。叶子卡多包一层无 DOM 的 `Fragment`（见局限）不是新抽象。 |

Worst within Standards: report 字面 `grep` 未一律 `-F`（§3）。计数仍可信。无产品缺陷。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `581a849c..139701c8`（审查开始时实现 commit 恰 1）。任务书 baseSha `2b4436a` 是写单时 main；实际 merge-base 是 briefs commit `581a849c`（含 D23 两单 + ESCALATION-7/8），two-dot 仍只有实现六文件。`git merge-base --is-ancestor 2b4436a HEAD` e=0。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 纯函数 + 六个单测 | 做到 | `grep -c 'export function groupColumnTasks' web/src/boardGrouping.ts` = **1**（`-F` 同 1）。`grep -cE '^\s*(test\|it)\(' web/src/boardGrouping.test.tsx` = **6**。六串各 `grep -c -F` = 各 **1**：`keeps order when there are no relations`、`nests same-column children right after their parent`、`keeps children flat when the parent is in another column`、`caps nesting at one level`、`hides children of collapsed parents`、`counts nested children`。用例体断言行数组：无关系 ids/depths 字面（`:13-14`）；`[P,X,c1,c2]` → `["P","c1","c2","X"]` + depths `[0,1,1,0]`（`:23-24`）；跨列平铺（`:30-31`）；一层封顶 g `depth 0`（`:37-38`）；折叠 hidden + `childCount` 仍 2（`:47-48`）；P=2 / X=0（`:57-58`）。`grep -c 'boardGrouping.test.tsx' package.json` = **1**。`git diff 581a849c..HEAD -- package.json \| grep -cE '^[-+] '` = **2**（只改 `test:components` 一行追加该文件）。 |
| ② 看板列 | 做到 | `grep -c 'groupColumnTasks(' web/src/components/BoardColumn.tsx` = **1**。`grep -c -F 'tasks: columnTasks'` = **1**。`grep -c -F 'data-testid="subtask-toggle"'` = **1**。`grep -c 'aria-expanded'` = **1**。`grep -c -F 'className="board-card-nested"'` = **1**。`grep -c '个子任务'` = **1**。拖拽删除行含 drag = **0**。`TaskCard.tsx` stat `wc -l` = **0**。开关：`:220-229` `aria-expanded={!collapsedParents.has(task.id)}`，文案 `text(\`${row.childCount} 个子任务\`, \`${row.childCount} sub-issues\`)`。 |
| ③ App 接线 | 做到 | `grep -c 'collapsedParents' web/src/App.tsx` = **3**。`grep -c 'onToggleCollapse='` = **1**。`grep -c 'collapsedParents='` = **1**。state `:453`、toggle `:454-461`、两个 prop `:2481-2483` / `:2511`。 |
| ④ 回归 | 做到 | `npm run typecheck > /tmp/d23r-typecheck.log 2>&1; e=$?` → **0**。`npm run build > /tmp/d23r-build.log 2>&1; e=$?` → **0**。`npm run check > /tmp/d23r-check.log 2>&1; e=$?` → **0**。Node 尾三数：`ℹ tests 158` / `ℹ pass 158` / `ℹ fail 0`。vitest：`Tests  26 passed (26)`（`boardGrouping.test.tsx (6 tests)` + 既有 20）。`git diff 581a849c..HEAD -- test/ web/src/components/*.test.tsx \| grep -cE '^-\s*(test\|it)\('` = **0**。越界 `git diff 581a849c..HEAD --stat -- server/ cli/ shared/ test/ docs/ README.md README.zh-CN.md package-lock.json web/src/types.ts web/src/api.ts web/src/components/TaskCard.tsx web/src/components/OtherTasksPanel.tsx \| wc -l` = **0**。`package-lock.json` two-dot `wc -l` = **0**。 |
| ⑤ 冒烟 | 做到 | 端口 **47998**（未用 47999）。`grep -c -F 'subtask-toggle' dist/web/assets/*.js \| grep -v ':0' \| wc -l` = **1**（`dist/web/assets/index-BRFXsEij.js:1`）。`DATA_DIR=/var/folders/sq/y3rzl_9d4kn1724g6s9z1q280000gn/T/tmp.WvANvTkdDw`。`/health` 200 `{"status":"ok"}`。`P=52226ba2 C1=48d8b0c3 C2=f63502b8 X=714486fb`。`rel1 e=0` `rel2 e=0`。`P.subIssues 2 C1.parent True C2.parent True X.parent None`。`index 200`。真浏览器见补充打点 7。47998 pid 2149 用完已杀；`unset TASKBOARD_URL`。 |
| ⑥ 回归 + 审查 | 做到 | `npm run check` e=**0**；`ℹ tests 158` / `pass 158` / `fail 0`；vitest `Tests  26 passed (26)`。越界 pathspec `wc -l` = **0**。本文件头行 **PASS**；S3 不触发。实现 report ⑥ 标 `NOT VERIFIED: 真浏览器` 正确（改由本席在 47998 做）。 |

Out of scope：

- 不做多层嵌套、不做跨列聚合、不做折叠落盘、不做「全部折叠 / 展开」：`caps nesting at one level` 断言 g `depth 0`；父不在数组 → 平铺；`collapsedParents` 仅 `useState`，App 无 localStorage；无「全部折叠」按钮。没做错。
- 不改拖放：`findDropBefore` 函数体与基线逐字相同（HEAD `:110-115`）；`getTaskDragShift` / `handleDrop` 与基线逐字相同；含 `drag` 的删除行 **0**。没做错。
- 不动 `server/**`、`cli/**`、`shared/**`、`test/**`、`web/src/types.ts`、`web/src/api.ts`、`TaskCard.tsx`、`OtherTasksPanel.tsx`、`docs/**`（实现 diff）、`README*`：two-dot 对这些 pathspec 空（本席 VERDICT 在 `docs/research/D23/`，不计入实现 diff）。没做错。
- 不重起 47823、不碰主仓 `.data/`：47823 pid **54406** 审查前后仍 LISTEN；主仓 `.data/taskboard.sqlite` mtime 均为 `1788700980`。没做错。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `581a849c..139701c8`）：

1. 断言删除：`--diff-filter=D -- test/` 空。`git diff … -- test/ 'web/src/**/*.test.ts*'` 删除行含 `assert|expect`：**none**。新增 `\.skip\(|\.only\(|@ts-ignore|@ts-nocheck`：空。`# tests` = **158**。vitest **26**（不 < 26）。未命中。
2. 守卫：diff 无新增 `|| true`、无新增 `catch`。`BoardColumn` 含 `drag` 的行删除 **0**，`grep -ci drag` HEAD=31 = 基线 31。未命中。
3. 门禁：commit message 与 diff 无 `--no-verify` / `--force`。`git log … \| grep -cE '\-\-no-verify|\-\-force'` → **0**。未命中。
4. 判据：`docs/briefs/**` `docs/agents/**` `docs/research/**`（实现 diff）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `shared/**` `server/**` `cli/**` `test/**` `web/src/types.ts` `web/src/api.ts` `web/src/components/TaskCard.tsx` `web/src/components/OtherTasksPanel.tsx` `package-lock.json` 无 diff。`package.json` 只改 `test:components` 一行（`^[-+] ` = 2）。未命中。
5. 验证替代：`boardGrouping.test.tsx` 无 mock/stub `groupColumnTasks`（真 import）；冒烟先 `relation add` 两条 parent（`rel1 e=0` `rel2 e=0`）再断言 `P.subIssues 2`。未命中。

清单 5 项全 0。

其它：

1. **无关系保序**：用例 `keeps order when there are no relations` 已有。本席另跑 `node --experimental-strip-types --input-type=module -e` import 上线文件：`groupColumnTasks([a,b,c], new Set())` → ids `['a','b','c']`，depths `[0,0,0]`，`all0 true`。
2. **子任务先于父**：用例未覆盖。本席 `node -e`：`[c1, P, c2]` → ids `['P','c1','c2']`，depths `[0,1,1]`，`2_ids_eq_P_c1_c2 true`（子任务在父之前的原位置被移除，不重复）。
3. **父在本列但父自己是嵌套行**：`[P, c, g]`（g→c→P）→ `P depth0 childCount1` / `c depth1` / `g depth0 hidden false`。再 `collapsedParents = {c}`：g 仍 `depth 0 hidden false`（`3_g_unaffected true`）；c 仍 `depth 1 hidden false`（c 不是 depth 0，没有开关，折叠集里的 c 不影响 g）。
4. **折叠后拖拽落点**：`findDropBefore` HEAD `:110-115` 仍 `container.querySelectorAll<HTMLElement>("[data-task-id]")`，与基线逐字相同。隐藏子任务 `if (row.hidden) return null`（`:181`）不进 DOM，不会成为落点。`getTaskDragShift` 用 `taskIndexes` / `remainingIndexes`（数据源局部 `tasks` = `rows.map(row => row.task)`）。`remainingTasks` 那行与基线逐字相同：
   ```
   BASE 90 '  const remainingTasks = tasks.filter((task) => task.id !== draggedTaskId);'
   HEAD 97 '  const remainingTasks = tasks.filter((task) => task.id !== draggedTaskId);'
   same True
   ```
5. **列头计数**：`BoardColumn.tsx:161` `{label}{tasks.length > 0 ? \` ${tasks.length}\` : ""}`，`tasks` = 全量 rows（含 hidden）。浏览器折叠后 h2 仍 `等待认领 4`（见打点 7）。
6. **diff 体积**：`git diff --stat 581a849cb58e128004a7f4ccc8d664815900bb32..HEAD` 原文：
   ```
    package.json                       |  2 +-
    web/src/App.tsx                    | 13 +++++++++
    web/src/boardGrouping.test.tsx     | 60 ++++++++++++++++++++++++++++++++++++++
    web/src/boardGrouping.ts           | 49 +++++++++++++++++++++++++++++++
    web/src/components/BoardColumn.tsx | 43 +++++++++++++++++++++++----
    web/src/styles.css                 | 21 +++++++++++++
    6 files changed, 182 insertions(+), 6 deletions(-)
   ```
   `git diff --numstat`：`BoardColumn.tsx` 38/5 净增 **33** ≤ 45；`App.tsx` 13/0 净增 **13** ≤ 20；`boardGrouping.ts` 49/0 **49** ≤ 60。未超。
7. **真浏览器**：`orca tab create --url http://127.0.0.1:47998/?project=local`（page `139dcd66-c70c-4d71-a681-329bd5c3c66a`）。todo 列 h2=`等待认领 4`。初始 DOM 顺序：`无关任务`(X, 平铺) → `父任务`(P, 平铺) → `button.subtask-toggle` 文案 `▾ 2 个子任务` `aria-expanded="true"` → `.board-card-nested[data-depth=1]` 内 `子任务二`(C2) → 同形 `子任务一`(C1)。X 不在 nested 里。点开关后：C1/C2 不在 DOM（`hasC1 false hasC2 false`），`nestedCount 0`，toggle `▸ 2 个子任务` `aria-expanded="false"`，h2 仍 `等待认领 4`，X 与 P 仍在。再点回来：C1/C2 回到 `.board-card-nested`，`aria-expanded="true"`，文案 `▾ 2 个子任务`，h2 仍 4。页已关。

另核：审查开始时 `git rev-list --count 581a849c..HEAD` = **1**；`git diff-tree -r --numstat --no-commit-id HEAD` 原文：
```
1	1	package.json
13	0	web/src/App.tsx
60	0	web/src/boardGrouping.test.tsx
49	0	web/src/boardGrouping.ts
38	5	web/src/components/BoardColumn.tsx
21	0	web/src/styles.css
```
`wc -l` = **6**，每行路径均在议题允许的 6 个文件内。`git ls-remote --heads origin spec/23` 空（未 push）。`git log --format=%b 581a849c..139701c8 | grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --summary` 0 行。

## 局限

- impl report ①②③ 若干字面 `grep` 未一律 `-F`（Standards §3）；议题原文部分即无 `-F`，针无 `$`，本席 `grep -F` 计数相同。建议级。
- 叶子行（depth 0 且 `childCount === 0`）多包 `<Fragment key={task.id}>{card}</Fragment>`（`BoardColumn.tsx:233`），议题写「卡片 JSX 原样（`<TaskCard key={task.id} …/>`）」。Fragment 不产生 DOM，产品行为不变。建议级。
- 真浏览器里 X 排在 P 之前（看板 `sortOrder` 新的在前：X=LOCAL-4、P=LOCAL-1、C2=LOCAL-3、C1=LOCAL-2 → 输入 `[X,C2,C1,P]` → 输出 `[X,P,C2,C1]`）。算法按原顺序，子任务仍紧跟 P 且 X 平铺。不是缺陷。
- 未在浏览器里拖拽测落点；`findDropBefore` 与 `remainingTasks` 按源码 / 基线逐字核。抽查未见，不构成产品缺陷。
- 未在真浏览器造跨列 / 二层嵌套；纯函数用例 + `node -e` 覆盖。不计 finding。
