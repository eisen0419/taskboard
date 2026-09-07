# D25 · knip 死代码门禁：装 + 配置 + 进 `npm run check` + 清七项（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/25>（`gh issue view 25 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」4 条。** 议题里那张七项表就是你要清的全部清单，Fable 已逐条 `git grep` 核过。

席位：`codex-sol`。分支：`spec/25`，**baseSha = `0dd2149`**（taskboard main，写单时 HEAD；行号取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec（恰 10 个）：`package.json`、`package-lock.json`（只经 npm 命令变更）、`knip.json`（新建）、`server/composer-reference.mjs`（删除）、`shared/domain.mjs`、`web/src/components/PendingAttachments.tsx`、`web/src/components/SemanticIcons.tsx`、`web/src/components/ComposerCompletionMenu.tsx`、`web/src/components/LinearIcon.tsx`、`web/src/taskConversations.ts`。**其余一律不动**。

## 先装依赖

`npm install > /tmp/npm-d25.log 2>&1; e=$?`（约 1 分钟；**不要软链主仓**）。

## 基线取值（协调席已在 0dd2149 跑过；你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                                   # e=0；# tests 158 # pass 158 # fail 0；vitest「Tests 26 passed」
grep -c -F '"knip"' package.json                                             # 0
grep -c -F '"smol-toml"' package.json                                        # 1
ls knip.json server/composer-reference.mjs 2>&1 | grep -c 'No such'          # 1（knip.json 不存在，composer-reference 存在）
git grep -c 'composer-reference' -- ':!server/composer-reference.mjs' ':!web/src/components/InlineMediaComposer.test.tsx' ':!web/src/components/InlineMediaComposer.tsx'   # 空（零真引用）
```

## 步骤（按序，每步有判据）

1. **配置先落**：新建根目录 `knip.json`，内容逐字取议题「期望行为 · 配置」那段 JSON（四个键）。
2. **装 / 卸**：`npm install --save-dev --save-exact knip@6.34.0 > /tmp/npm-knip.log 2>&1; e=$?` → 0；`npm uninstall smol-toml > /tmp/npm-toml.log 2>&1; e=$?` → 0。核 `grep -c -F '"knip": "6.34.0"' package.json` = 1、`grep -c -F '"smol-toml"' package.json` = 0；`package-lock.json` 只由这两条命令改，**不手编**。**注意**：knip 6.34.0 自己依赖 `smol-toml ^1.8.0`，卸掉项目直接依赖后 lock 里仍会有 `node_modules/smol-toml`（1.8.x，`dev: true`），这是预期，不要为它改 knip 版本或手动删（ESCALATION-9 裁）；判据是 `npm ls smol-toml` 只剩经 knip 的一条路径。
3. **脚本**：`package.json` `scripts` 加 `"knip": "knip"`；`check` 改为 `"npm run typecheck && npm run knip && npm run build && npm test"`（逐字）。
4. **第一次跑门禁**：`npm run knip > /tmp/knip-1.log 2>&1; e=$?`（预期 e≠0，报 7 类发现，与议题表一致；**把这份 log 原样贴 report**。若报出表外的项，停手 BLOCKED 请示，不要动）。
5. **清七项**（严格按表）：
   - `git rm server/composer-reference.mjs`。
   - `shared/domain.mjs:10` `export const TASK_PRIORITIES` → `const TASK_PRIORITIES`（常量保留，`:32` 仍在用）。
   - `web/src/components/PendingAttachments.tsx`：删 `clipboardImages` 与 `PendingAttachments` 两个函数整体；随之无用的 `import { LinearIcon }` / `import { useTaskboardI18n }` 一并删；保留 `MAX_ATTACHMENT_SIZE` 与 `fileKey`（`InlineMediaComposer.tsx:50` 在用）。
   - `web/src/components/SemanticIcons.tsx`：删 `NewConversationIcon`（`:203`）/ `ReadOnlyPermissionIcon`（`:237`）/ `FullAccessPermissionIcon`（`:245`）/ `SendIcon`（`:249`）四个函数整体；`BasicIconProps` 等共享类型别动。
   - `web/src/taskConversations.ts:33` `export function taskConversations` → `function taskConversations`（`:68` 仍在用）。
   - `web/src/components/ComposerCompletionMenu.tsx:10` `export interface ComposerCompletionOption` → `interface …`；`web/src/components/LinearIcon.tsx:76` `export type LinearIconName` → `type …`；`web/src/taskConversations.ts:15` `export interface TaskProcessingPresentation` → `interface …`。
6. **第二次跑门禁**：`npm run knip > /tmp/knip-2.log 2>&1; e=$?` → **0**，`grep -c Unused /tmp/knip-2.log` = 0。若级联报出新项：在上述文件内是无用 import / 本地符号就继续删并记 deviation；在别的文件 = BLOCKED 请示。
7. **typecheck + build + 全 check**：`npm run typecheck > /tmp/tc.log 2>&1; e=$?` → 0；`npm run build > /tmp/build.log 2>&1; e=$?` → 0；`npm run check > /tmp/check.log 2>&1; e=$?` → 0，尾三数 158/158/0，vitest 26。
8. **冒烟**：下节。

## 冒烟（逐字跑，全段贴 report）

```
npm run knip > /tmp/knip-final.log 2>&1; echo "knip e=$?"; grep -c Unused /tmp/knip-final.log                 # 0 / 0
npm ls smol-toml                                                                                             # 恰一条：taskboard -> knip@6.34.0 -> smol-toml@1.8.x
python3 -c 'import json;d=json.load(open("knip.json"));print(sorted(d))'                                     # ['$schema', 'entry', 'ignore', 'project']
git diff --diff-filter=D --name-only $(git merge-base origin/main HEAD)..HEAD                                # server/composer-reference.mjs
git diff --name-only $(git merge-base origin/main HEAD)..HEAD | sort | tr '\n' ' '; echo                    # 恰 10 个文件
D=$(mktemp -d); TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &
sleep 2; curl -s http://127.0.0.1:47999/health; echo; curl -s -o /dev/null -w 'index %{http_code}\n' http://127.0.0.1:47999/
kill $(lsof -tiTCP:47999 -sTCP:LISTEN); echo "smoke done"
```

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0（现在含 knip）；`# tests` = 158 `# fail 0`；vitest `Tests 26 passed` |
| `package*.json` | ① 的六个 grep；`git diff $base..HEAD -- package.json \| grep -cE '^[-+] '` 取值贴（预期 4–8）；`git diff $base..HEAD --stat -- package-lock.json` 取值贴 |
| 删代码 | ④ 的全部 grep；`git diff --name-only $base..HEAD \| sort` 恰 10 个 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- `server/app.mjs` / `server/database.mjs` / `cli/**` / `test/**` / `web/src/App.tsx` 零 diff；158 / 26 用例一个不少。
- `PendingAttachments.tsx` 的 `MAX_ATTACHMENT_SIZE` / `fileKey`、`taskConversations.ts` 的 `taskCardPresentation`、`shared/domain.mjs` 的 `isTaskPriority`（`:32` 那个函数）行为不变。
- `knip.json` 不许有 `ignore*` 豁免；不许改 knip rules 级别。

## 验收口径

议题 ①–⑥ 逐条，判据命令逐字跑并贴取值；审查席会重跑同一套。

## 提交纪律

- **恰一个 commit**：`git add -- package.json package-lock.json knip.json shared/domain.mjs web/src/components/PendingAttachments.tsx web/src/components/SemanticIcons.tsx web/src/components/ComposerCompletionMenu.tsx web/src/components/LinearIcon.tsx web/src/taskConversations.ts`（`git rm` 的删除已暂存）→ `git commit -m "chore(knip): add knip gate to npm run check and remove seven unused exports/files/deps (#25)"`。commit 后 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 10。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁 `git reset`。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。2. 🔴 只改 pathspec 10 个文件；knip 报表外项 = BLOCKED 请示，不许 `ignore*`。3. 🔴 不 `terminal close` / `kill` 别的窗；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。4. 🔴 不碰 47823、主仓 `.data/`。5. 🔴 判「测试通过」一律 `cmd > log 2>&1; e=$?`；判字面串 `grep -F`（本机 grep 是 ugrep）；数量断言 `grep -c`；别把命令存进变量再 `$VAR` 展开；`python3 -c` 单行别用嵌套引号 f-string。6. 🔴 落盘顺序：临时文件 → `mv` → commit → `touch .DONE` → `worker_done`。7. 🟡 report 头行只认 PASS / FAIL / BLOCKED；拿不准就 BLOCKED + 问题。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d25-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "<csv>" --report-path /Users/happy/projects/taskboard/.scratch/d25-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节说明与「基线取值」都不得进入交付物。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。证据包六字段：① 验收 ①–⑤ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 第一次 knip log 原文 + 冒烟全段 ⑤ check 尾三数 + vitest 行 ⑥ `NOT VERIFIED`（没核到的写这里）。
