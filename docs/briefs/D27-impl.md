# D27 · 命令面板切视图落盘：`handlePaletteSelect` 视图分支改走 `selectBoardView`（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/27>（`gh issue view 27 --comments`）——判据真源是它的「验收（可数）」5 条与「Out of scope」4 条。** 本卡是一行替换，不多不少。

席位：`codex-sol`。分支：`spec/27`，**baseSha = `22752ed`**（taskboard main，写单时 HEAD；行号取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec（恰 1 个）：`web/src/App.tsx`。**其余一律不动**。

## 先装依赖

`npm install > /tmp/npm-d27.log 2>&1; e=$?`（约 1 分钟；**不要软链主仓**）。

## 基线取值（协调席已在 22752ed 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                                                          # e=0；# tests 158 # pass 158 # fail 0；vitest「Tests 26 passed」
grep -c 'selectBoardView(' web/src/App.tsx                                                          # 7
grep -c 'setBoardView(' web/src/App.tsx                                                             # 7
grep -c -F 'setBoardView(item.id.slice("view:".length) as BoardView);' web/src/App.tsx              # 1
grep -n -F 'setBoardView(item.id.slice("view:".length) as BoardView);' web/src/App.tsx              # 恰一行，base 在 :797，位于 function handlePaletteSelect 的 if (item.kind === "view") 分支
```

## 步骤（按序，每步有判据）

1. **定位**：上面最后一条 grep 的那一行，就是要改的唯一一行。它上面一行是 `if (item.kind === "view") {`。
2. **改**：该行 `setBoardView(` → `selectBoardView(`，缩进、参数、`as BoardView`、分号一字不动。可以用编辑器，也可以逐字跑：`sed -i '' 's/setBoardView(item.id.slice("view:".length) as BoardView);/selectBoardView(item.id.slice("view:".length) as BoardView);/' web/src/App.tsx`（BSD sed 要 `-i ''`）。改完 `git diff --numstat` 必须恰是 `1	1	web/src/App.tsx`，多一行少一行都回滚重来。
3. **核议题 ①②**：命令逐字跑，取值贴 report（`selectBoardView(` 8、`setBoardView(` 6、精确新行 1、精确旧行 0、awk 区间 1；numstat 一行、name-only 一个、`^[-+][^-+]` 2、`^@@` 1、`function selectBoardView` 在 diff 里 0）。
4. **typecheck + build + 全 check**：`npm run typecheck > /tmp/tc.log 2>&1; e=$?` → 0；`npm run build > /tmp/build.log 2>&1; e=$?` → 0；`npm run check > /tmp/check.log 2>&1; e=$?` → 0，尾三数 158/158/0，vitest 26。
5. **冒烟**：下节。

## 冒烟（逐字跑，全段贴 report）

```
base=$(git merge-base origin/main HEAD)
git diff --numstat $base..HEAD                                                                       # 1	1	web/src/App.tsx
git diff $base..HEAD | grep -E '^[-+][^-+]'                                                          # 恰两行：-…setBoardView(item.id… 与 +…selectBoardView(item.id…
git diff $base..HEAD --stat -- server/ cli/ shared/ test/ docs/ README.md README.zh-CN.md package.json package-lock.json knip.json web/src/components/ | wc -l   # 0
ls dist/web/index.html                                                                               # 存在（步骤 4 的 build 产物）
D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; curl -s http://127.0.0.1:47999/health; echo; curl -s -o /dev/null -w 'index %{http_code}\n' http://127.0.0.1:47999/; curl -s -o /dev/null -w 'projects %{http_code}\n' http://127.0.0.1:47999/api/projects
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); echo "smoke done"
```

真浏览器不做（议题 ④ 由审查席做），report ⑥ 写 `NOT VERIFIED: 真浏览器`。

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0（含 knip）；`# tests` = 158 `# fail 0`；vitest `Tests 26 passed` |
| `web/src/App.tsx` | 议题 ① 五个 grep / awk 取值；② 五个 diff 取值 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- `selectBoardView` 定义（base `:1343-1350`）零 diff；`handlePaletteSelect` 的项目 / 议题分支与 `setPaletteOpen(false)` / `setPaletteQuery("")` 零 diff；`openInboxTask`（base `:812-835`）零 diff。
- 158 / 26 用例一个不少；`web/src/components/**` 零 diff。

## 验收口径

议题 ①–③ 逐条，判据命令逐字跑并贴取值；④ 审查席做；审查席会重跑 ①–③。

## 提交纪律

- **恰一个 commit**：`git add -- web/src/App.tsx` → `git commit -m "fix(web): persist board view chosen from the command palette via selectBoardView (#27)"`。commit 后 `git diff-tree -r --numstat --no-commit-id HEAD` 恰 `1	1	web/src/App.tsx`。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec 1 个文件的那 1 行；typecheck / build / check 因这一行而红 = BLOCKED 请示（把 log 贴上），不许顺手改别处。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`；别把命令存进变量再 `$VAR` 展开；`python3 -c` 单行别用嵌套引号 f-string。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d27-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "web/src/App.tsx" --report-path /Users/happy/projects/taskboard/.scratch/d27-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–③ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ `git diff $base..HEAD` 原文（就两行）+ 冒烟全段 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（真浏览器写这里）。
