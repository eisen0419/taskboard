# D23 · 看板列里父子任务嵌套与折叠（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/23>（`gh issue view 23 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」4 条。** 背景：D7 F3（`docs/research/D7/multica-reference-2.md`）。活库现在 0 条 parent 关系，一切用临时库造数验证。

席位：`codex-sol`。分支：`spec/23`，**baseSha = `2b4436a`**（taskboard main，写单时 HEAD；行号取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：`web/src/boardGrouping.ts`（新建）、`web/src/boardGrouping.test.tsx`（新建）、`web/src/components/BoardColumn.tsx`、`web/src/App.tsx`、`web/src/styles.css`、`package.json`（**只许改 `test:components` 一行**）。**其余一律不动**：`package-lock.json`、`server/**`、`cli/**`、`shared/**`、`test/**`、`web/src/types.ts`、`web/src/api.ts`、`web/src/components/TaskCard.tsx`、`web/src/components/OtherTasksPanel.tsx`、其他 `components/*`、`docs/**`、`README*`、`AGENTS.md`、`CLAUDE.md`、`.teams-orca*.json`、`dist/**`。

## 先装依赖

`npm install > /tmp/npm-d23.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，**不要软链主仓**）。

## 基线取值（协调席已在 2b4436a 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                                   # e=0；# tests 158 # pass 158 # fail 0；vitest「Tests 20 passed」
ls web/src/boardGrouping.ts 2>&1 | grep -c 'No such'                         # 1
grep -c 'collapsedParents' web/src/App.tsx                                   # 0
grep -c -F 'data-testid="subtask-toggle"' web/src/components/BoardColumn.tsx # 0
grep -ci 'drag' web/src/components/BoardColumn.tsx                           # 取值记下（31 左右），交付后不减
```

## 扩展点（行号取自 2b4436a，以内容为准）

- **纯函数** `web/src/boardGrouping.ts`：
  ```ts
  export interface ColumnRow<T> { task: T; depth: 0 | 1; childCount: number; hidden: boolean }
  export function groupColumnTasks<T extends { id: string; relations: { parent: { id: string } | null } }>(
    tasks: readonly T[],
    collapsedParents: ReadonlySet<string>,
  ): ColumnRow<T>[]
  ```
  算法：`ids = new Set(tasks.map(t => t.id))`；`parentOf(t) = t.relations.parent?.id`，仅当 `ids.has(parentOf(t))` 才算「父在本列」；`isNested(t) = 父在本列 && !父在本列(父任务)`（一层封顶）；按原顺序遍历：`isNested` 的先跳过；非嵌套的推 `{ task, depth: 0, childCount: 子数, hidden: false }`，随后把所有 `isNested && parentOf === t.id` 的子任务按原相对顺序推 `{ task, depth: 1, childCount: 0, hidden: collapsedParents.has(t.id) }`。用 `Map<parentId, T[]>` 预分组，O(n)。不 import React、不 import `types.ts`（泛型约束就够，测试才不用造完整 `Task`）。
- **单测** `web/src/boardGrouping.test.tsx`（vitest；**后缀必须是 `.test.tsx`**：工位 Node 22.23 的 `node --test` 默认会发现 `*.test.ts` 并因无扩展名 import 报错，`.tsx` 不在它的默认 glob 里，ESCALATION-8 裁；纯逻辑不需要 jsdom 但跑在同一命令里没关系）：`const t = (id, parent = null) => ({ id, relations: { parent: parent ? { id: parent } : null } })`。六个用例标题逐字含议题①的六个串：无关系保序；`[P, X, c1, c2]` → `P, c1, c2, X` 且 c1/c2 `depth 1`；父在别列（不在数组里）→ 平铺 `depth 0`；`[P, c, g]`（g 的父是 c，c 的父是 P）→ g `depth 0` 平铺、c `depth 1`；`collapsedParents = {P}` → c1/c2 `hidden true`、P 仍 `childCount 2`；`childCount` 精确等于嵌套子数（X 为 0）。`package.json:22` `test:components` 追加 `web/src/boardGrouping.test.tsx`（空格分隔，别改成 glob）。
- **BoardColumn** `web/src/components/BoardColumn.tsx`：props 加 `collapsedParents: ReadonlySet<string>; onToggleCollapse: (taskId: string) => void;`。**解构里把 `tasks` 改名为 `tasks: columnTasks`**（逐字，判据 grep），函数体开头 `const rows = groupColumnTasks(columnTasks, collapsedParents); const tasks = rows.map((row) => row.task);`——这样 `taskIndexes` / `remainingTasks` / `remainingIndexes` 三个 Map、列头 `tasks.length`、空态判断全部自动用视觉顺序，**那三行以及 `findDropBefore` / `handleDrop` / `getTaskDragShift` / 任何含 drag 的行一字不动**（ESCALATION-7 裁：`remainingTasks` 那行含 `draggedTaskId`，不能改它）。`:172` `tasks.map(...)` 改为 `rows.map((row) => { if (row.hidden) return null; const { task } = row; … })`：卡片 JSX 原样（`<TaskCard key={task.id} …/>`）；`row.depth === 1` 时外面包 `<div className="board-card-nested" data-depth="1" key={task.id}>…</div>`（key 移到外层）；`row.childCount > 0` 时在 `<TaskCard>` 之后同级渲染
  ```tsx
  <button type="button" className="subtask-toggle" data-testid="subtask-toggle" aria-expanded={!collapsedParents.has(task.id)} onClick={() => onToggleCollapse(task.id)}>
    {collapsedParents.has(task.id) ? "▸" : "▾"} {text(`${row.childCount} 个子任务`, `${row.childCount} sub-issues`)}
  </button>
  ```
  （用一个 Fragment 包 card + toggle，key 在 Fragment 上）。列头 `tasks.length` 不动；空态判断不动。`text` 已在组件里（`useTaskboardI18n`）。
- **App** `web/src/App.tsx`：`:463` 附近 `const [collapsedParents, setCollapsedParents] = useState<Set<string>>(() => new Set());`；`function toggleCollapsedParent(taskId: string) { setCollapsedParents((current) => { const next = new Set(current); if (next.has(taskId)) next.delete(taskId); else next.add(taskId); return next; }); }`；`:2465-2496` `<BoardColumn>` 加 `collapsedParents={collapsedParents}` `onToggleCollapse={toggleCollapsedParent}`。`tasksByStatus` `:1285` 不动。
- **样式** `web/src/styles.css`：`.board-card-nested { margin-left: 16px; padding-left: 8px; border-left: 2px solid var(--border-strong); }`、`.subtask-toggle`（小字、次要色、无边框、hover 下划线、`margin: -4px 0 8px 4px`）。用现有变量。

## 你要做的 6 件（= 议题验收 ①–⑥）

**① 纯函数 + 六个单测 + package.json 一行。**
**② BoardColumn**：五个 grep 判据 + `tasks: columnTasks` 解构 + 拖拽零删除行 + TaskCard 零 diff。
**③ App**：state + toggle + 两个 prop。
**④ 回归**：typecheck / build / check 全 e=0；node 158；vitest ≥ 26；pathspec 外零 diff。
**⑤ 冒烟**：下节全段贴 report。
**⑥ 审查**：不归你。

## 冒烟（逐字跑，全段贴 report）

```
npm run build > /tmp/build-d23.log 2>&1; echo "build e=$?"
grep -c -F 'subtask-toggle' dist/web/assets/*.js | grep -v ':0' | wc -l                              # ≥1
D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; export TASKBOARD_URL=http://127.0.0.1:47999; U=$TASKBOARD_URL; A='x-taskboard-client: taskctl'; J='content-type: application/json'
T() { node cli/taskctl.mjs "$@"; }
mk() { curl -s -X POST $U/api/tasks -H "$A" -H "$J" -d "{\"projectId\":\"local\",\"title\":\"$1\",\"status\":\"todo\",\"threadId\":\"smoke\"}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["task"]["id"])'; }
P=$(mk 父任务); C1=$(mk 子任务一); C2=$(mk 子任务二); X=$(mk 无关任务); echo "P=${P:0:8} C1=${C1:0:8} C2=${C2:0:8} X=${X:0:8}"
T issue relation add "$C1" --type parent --issue "$P" --thread-id smoke --json > /dev/null; echo "rel1 e=$?"
T issue relation add "$C2" --type parent --issue "$P" --thread-id smoke --json > /dev/null; echo "rel2 e=$?"
curl -s "$U/api/tasks?projectId=local" | python3 -c '
import json,sys
ts={t["id"]:t for t in json.load(sys.stdin)["tasks"]}
P,C1,C2,X=sys.argv[1:5]
print("P.subIssues",len(ts[P]["relations"]["subIssues"]),"C1.parent",(ts[C1]["relations"]["parent"] or {}).get("id")==P,"C2.parent",(ts[C2]["relations"]["parent"] or {}).get("id")==P,"X.parent",ts[X]["relations"]["parent"])' "$P" "$C1" "$C2" "$X"    # 2 True True None
curl -s -o /dev/null -w 'index %{http_code}\n' $U/; curl -s $U/health; echo
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); unset TASKBOARD_URL; echo "smoke done"
```

看板行为的真判定在 vitest（纯函数）+ 审查席浏览器；不要求你开浏览器。若你的窗能开 Orca 内嵌浏览器，在 47999 打开 `/?project=local` 看 todo 列：P 下有「2 个子任务」开关、C1 / C2 缩进、X 平铺；点一下开关子任务消失。能做就写进 report，不能就 `NOT VERIFIED: 真浏览器`。

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# tests` = 158 `# fail 0`；vitest `Tests N passed` N ≥ 26 |
| `web/**` | `npm run typecheck` e=0；冒烟全段；`git diff $base..HEAD --stat -- server/ cli/ shared/ test/ web/src/types.ts web/src/api.ts web/src/components/TaskCard.tsx web/src/components/OtherTasksPanel.tsx \| wc -l` = 0 |
| `BoardColumn.tsx` | `git diff $base..HEAD -- web/src/components/BoardColumn.tsx \| grep -E '^-' \| grep -vE '^---' \| grep -ci drag` = 0 |
| `package.json` | `git diff $base..HEAD -- package.json \| grep -cE '^[-+] '` = 2；`git diff $base..HEAD -- package-lock.json \| wc -l` = 0 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- 既有 158 条服务端用例与 20 条组件用例不删不改。
- `BoardColumn` 的拖拽：`findDropBefore` / `handleDrop` / `getTaskDragShift` 与所有含 `drag` 的行零删除；`TaskCard` 零 diff；列头计数与空态不变。
- 无 parent 关系时（活库现状）看板渲染与改前逐卡相同（`groupColumnTasks` 在无关系时保序、全部 `depth 0`、无开关）。
- 不加依赖；`package-lock.json` 零 diff。

## 验收口径

议题 ①–⑥ 逐条，判据命令逐字跑并贴取值；审查席会重跑同一套。

## 提交纪律

- **恰一个 commit**：`git add -- web/src/boardGrouping.ts web/src/boardGrouping.test.tsx web/src/components/BoardColumn.tsx web/src/App.tsx web/src/styles.css package.json` → `git commit -m "feat(board): nest and collapse same-column sub-issues under their parent (#23)"`。commit 后 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 6 且每行路径在 pathspec 内。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec；`package-lock.json` 有 diff 即停手请示；发现必须改别处才能做完 = BLOCKED 请示，不要自己扩范围。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`；冒烟结束 `unset TASKBOARD_URL`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`；别把命令存进变量再 `$VAR` 展开（zsh 不分词）；`python3 -c` 单行别用嵌套引号 f-string（上面冒烟用 `python3 -c '多行'` + argv 传值）。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d23-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "<csv>" --report-path /Users/happy/projects/taskboard/.scratch/d23-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–⑤ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 冒烟全段原文 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（没核到的写这里，真浏览器没做就写在这）。
