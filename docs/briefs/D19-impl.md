# D19 · 命令面板：Cmd/Ctrl+K 搜议题 / 切项目 / 切视图（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/19>（`gh issue view 19 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」4 条。** 背景：D7 F6（`docs/research/D7/multica-reference-2.md`，multica 用 cmdk；我们手写，不引依赖）。

席位：`codex-sol`。分支：`spec/19`，**baseSha = `cad5e45`**（taskboard main，写单时 HEAD；行号取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：`web/src/components/CommandPalette.tsx`（新建）、`web/src/components/CommandPalette.test.tsx`（新建）、`web/src/App.tsx`、`web/src/styles.css`、`package.json`（**只许改 `test:components` 一行**）。**其余一律不动**：`package-lock.json`、`server/**`、`cli/**`、`shared/**`、`test/**`、`web/src/api.ts`、`web/src/types.ts`、`web/src/taskFilters.ts`、`web/src/i18n.tsx`、其他 `components/*`、`docs/**`、`README*`、`AGENTS.md`、`CLAUDE.md`、`.teams-orca*.json`、`dist/**`。

## 先装依赖

`npm install > /tmp/npm-d19.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，**不要软链主仓**）。

## 基线取值（协调席已在 cad5e45 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                                   # e=0；# tests 152 # pass 152 # fail 0；vitest「Tests 14 passed」
ls web/src/components/CommandPalette.tsx 2>&1 | grep -c 'No such'            # 1
grep -c 'matchesTaskSearch(' web/src/App.tsx                                 # 取值记下，交付后 +1
grep -c -F '<CommandPalette' web/src/App.tsx                                  # 0
grep -c 'CommandPalette.test.tsx' package.json                               # 0
```

## 扩展点（行号取自 cad5e45，以内容为准）

- **组件** `web/src/components/CommandPalette.tsx`：照 `ComposerCompletionMenu.tsx` 的 props 形状（`activeIndex` / `onActiveIndexChange` / `onSelect` / `onClose`）与 `InboxView.tsx` 的 i18n 写法（`const { text } = useTaskboardI18n()`）。结构：`<div className="command-palette-backdrop" onClick={backdrop 命中才 onClose}>` → `<div className="command-palette" role="dialog" aria-modal="true" aria-label={text("命令面板", "Command palette")}>` → `<input autoFocus data-testid="command-palette-input" value={query} onChange onKeyDown placeholder=…/>` → `<ul>` 分组：每组 `<li className="command-palette-group">` 标题 + 若干 `<li data-testid="command-palette-item" aria-selected={i === activeIndex} onMouseEnter={onActiveIndexChange(i)} onClick={onSelect(item)}>`（`selectableIndex` 跨组连续编号，照 `ComposerCompletionOption.selectableIndex`）。`onKeyDown`：`ArrowDown` → `(activeIndex + 1) % total`；`ArrowUp` → `(activeIndex - 1 + total) % total`；`Enter` → `onSelect(items[activeIndex])`（total 0 时不动）；`Escape` → `onClose()`；四个都 `preventDefault`。total 0 时渲染 `<div className="command-palette-empty">{text("没有匹配项", "No matches")}</div>`。组件内**零 fetch、零全局监听**（全局键盘在 App）。
- **App 状态** `web/src/App.tsx`：`const [paletteOpen, setPaletteOpen] = useState(false); const [paletteQuery, setPaletteQuery] = useState(""); const [paletteIndex, setPaletteIndex] = useState(0);`（放 `:463` `search` 附近）。`paletteGroups = useMemo(...)`：
  - 视图组 `id: "views"`，label `text("视图", "Views")`，六项 `{ id: "view:<BoardView>", kind: "view", label: <页签同文案，`:2088-2135`：README / 仪表盘 / 收件箱 / 议题看板 / 列表视图 / 甘特图> }`，query 非空时按 `label.toLowerCase().includes(q)` 过滤；
  - 项目组 `id: "projects"`，label `text("项目", "Projects")`，`[{ id: "project:__all__", kind: "project", label: text("全部项目", "All projects") }, ...projects.map(p => ({ id: \`project:${p.id}\`, kind: "project", label: p.name, hint: p.id }))]`，query 非空时按 `name` / `id` 包含过滤；
  - 议题组 `id: "tasks"`，label `text("议题", "Issues")`，**query 为空时不放**；非空时 `tasks.filter(t => matchesTaskSearch(t, paletteQuery, language)).slice(0, 20).map(t => ({ id: \`task:${t.id}\`, kind: "task", label: \`${t.identifier} ${t.title}\`, hint: <状态中文，App 里已有状态文案表就复用> }))`。
  deps：`[paletteQuery, projects, tasks, language, text]`。`paletteQuery` 变化时 `setPaletteIndex(0)`（effect）。
- **App 动作** `handlePaletteSelect(item)`：`view:` → `setBoardView(<value>)`；`project:__all__` → `setSelectedProjectId(ALL_PROJECTS_ID)`；`project:<id>` → `setSelectedProjectId(id)`；`task:<id>` → 找到 task 后 `openTaskDetail(task)`（`:686`）。执行后 `setPaletteOpen(false); setPaletteQuery("")`。
- **全局快捷键** `:1145` `handleShortcut`：在 Cmd/Ctrl+Z 那段**之前**加：`if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); setPaletteOpen((open) => !open); return; }`（判据 awk 在函数体内找 `"k"`；不受 `isTyping` 守卫限制）；再加 `if (event.key === "Escape" && paletteOpen) { setPaletteOpen(false); return; }` 放在既有 Esc 关详情之前。deps 数组补 `paletteOpen`。既有四条快捷键一字不动。
- **渲染**：在 `:2277` 附近主区之外（与建项目对话框同级，`:2490` 前后）加 `{paletteOpen && <CommandPalette query={paletteQuery} onQueryChange={setPaletteQuery} groups={paletteGroups} activeIndex={paletteIndex} onActiveIndexChange={setPaletteIndex} onSelect={handlePaletteSelect} onClose={() => { setPaletteOpen(false); setPaletteQuery(""); }} />}`；import 加在 `:53` `InboxView` 旁。
- **样式** `web/src/styles.css`：`.command-palette-backdrop`（fixed 全屏、半透明、z-index 高于 `.header-project-menu`）、`.command-palette`（居中、宽 min(640px, 92vw)、`box-shadow: var(--dialog-shadow)`、`background: var(--surface-raised)`、圆角 10px）、`.command-palette input`、`.command-palette-group`、`[aria-selected="true"]` 高亮、`.command-palette-empty`。用现有 CSS 变量，不引新色值。
- **组件测试** `web/src/components/CommandPalette.test.tsx`：照 `InboxView.test.tsx`（`render` 包 `TaskboardLanguageProvider`，`fireEvent.keyDown(input, { key: "ArrowDown" })`，`vi.fn()` 回调）。六个用例标题逐字含议题③的六个串。`package.json:22` `test:components` 追加 `web/src/components/CommandPalette.test.tsx`（空格分隔，别改成 glob）。

## 你要做的 6 件（= 议题验收 ①–⑥）

**① 组件**：五个 grep 判据（input testid 1、item testid ≥1、role dialog 1、四个键名 ≥4、fetch 0）。
**② App 接线**：`<CommandPalette` 1；`handleShortcut` 体内 `"k"` ≥1；三个 `kind:` 字面各 ≥1；`matchesTaskSearch(` 比基线 +1；空态文案在组件里恰 1。
**③ 六个组件用例**（标题逐字）：
- `renders groups and items`：两组三项，断言组标题与三个 `command-palette-item` 都在，`aria-selected` 只在 `activeIndex` 那行。
- `ArrowDown moves the active row and wraps`：三项 activeIndex 2 时 ArrowDown → `onActiveIndexChange(0)`；ArrowUp 从 0 → 2。
- `Enter selects the active item`：`onSelect` 收到 activeIndex 对应的 item 对象。
- `Escape closes the palette`：`onClose` 被调 1 次。
- `typing calls onQueryChange`：`fireEvent.change(input, { target: { value: "in" } })` → `onQueryChange("in")`。
- `renders the empty state`：`groups: []` → 文案 `没有匹配项`；Enter 不调 `onSelect`。
**④ 回归**：typecheck / build / check 全 e=0；node 152 不变；vitest ≥ 20；不删既有用例；pathspec 外零 diff。
**⑤ 冒烟**：下节全段贴 report。
**⑥ 审查**：不归你。

## 冒烟（逐字跑，全段贴 report）

```
npm run build > /tmp/build-d19.log 2>&1; echo "build e=$?"
grep -c -F 'command-palette-input' dist/web/assets/*.js | grep -v ':0' | wc -l                       # ≥1（哪个 bundle 含它）
D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; U=http://127.0.0.1:47999
curl -s -o /dev/null -w 'index %{http_code}\n' $U/                                                    # 200
curl -s $U/health; echo                                                                               # {"status":"ok"}
curl -s -o /dev/null -w 'inbox %{http_code}\n' $U/api/inbox                                           # 200（后端未动）
curl -s $U/ | grep -c -F 'assets/'                                                                    # ≥1（index 引到了产物）
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); echo "smoke done"
```

组件行为的真判定在 vitest（jsdom）；不要求你开浏览器。若你的窗能开 Orca 内嵌浏览器（`orca browser` 系列命令可用），在 47999 上按 Cmd+K → 输 `in` → Enter 走一遍并把看到的写进 report 的 `NOT VERIFIED` 之外；不能就明写 `NOT VERIFIED: 真浏览器交互`。

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# tests` = 152 `# fail 0`；vitest `Tests N passed` N ≥ 20 |
| `web/**` | `npm run typecheck` e=0；冒烟全段；`git diff $base..HEAD --stat -- server/ cli/ shared/ test/ web/src/api.ts web/src/types.ts web/src/taskFilters.ts \| wc -l` = 0 |
| `package.json` | `git diff $base..HEAD -- package.json \| grep -cE '^[-+] '` = 2；`git diff $base..HEAD -- package-lock.json \| wc -l` = 0 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- 既有 14 条组件用例与 152 条服务端用例不删不改。
- `handleShortcut` 里既有四条快捷键（Cmd/Ctrl+Z、`c`、`/`、Esc 关详情）的条件与动作一字不动，只在前面加两段、deps 补 `paletteOpen`。
- `openTaskDetail` / `setBoardView` / `setSelectedProjectId` 不改签名；`matchesTaskSearch` 不改。
- 不加依赖；`package-lock.json` 零 diff。

## 验收口径

议题 ①–⑥ 逐条，判据命令逐字跑并贴取值；审查席会重跑同一套。

## 提交纪律

- **恰一个 commit**：`git add -- web/src/components/CommandPalette.tsx web/src/components/CommandPalette.test.tsx web/src/App.tsx web/src/styles.css package.json` → `git commit -m "feat(web): command palette with Cmd/Ctrl+K for issues, projects and views (#19)"`。commit 后 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 5 且每行路径在 pathspec 内。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec；`package-lock.json` 有 diff 即停手请示；发现必须改别处才能做完 = BLOCKED 请示，不要自己扩范围。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`；别把命令存进变量再 `$VAR` 展开（zsh 不分词）；`python3 -c` 单行别用嵌套引号 f-string。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d19-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "<csv>" --report-path /Users/happy/projects/taskboard/.scratch/d19-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–⑤ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 冒烟全段原文 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（没核到的写这里，真浏览器交互没做就写在这）。
