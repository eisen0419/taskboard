PASS
reviewedHead: 2ca29ffa28176ffb33aed0e815d862b032e05476
fixedPoint: 407ed6d0895bb265e7ae36c647a90b51ce724f12
diffCommand: git diff 407ed6d0895bb265e7ae36c647a90b51ce724f12..HEAD
commits: 2ca29ff docs(research): D5 multica reference report (#5)
implReport: /Users/happy/projects/taskboard/.scratch/d5-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/5 （验收 8 + Out of scope 5；comments 空）
conclusion: 逐条核过（①–⑧ 命令与取值均为本席亲跑；证据强度 4 项为抽核；未改交付物、未跑 npm、未 push）

验收 8 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到 ⑦做到 ⑧做到。Out of scope 5 条均未做错。逃避与拧松清单：清单 5 项全 0。

## Spec 轴

`<file>` = `docs/research/D5/multica-reference.md`。审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `407ed6d..2ca29ff`（实现 commit 恰 1）。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 交付物与 commit | 做到 | `test -f docs/research/D5/multica-reference.md && echo EXISTS` → `EXISTS`。`git rev-list --count 407ed6d..HEAD` → `1`。`git diff-tree -r --numstat --no-commit-id HEAD` → `196	0	docs/research/D5/multica-reference.md`；`… \| wc -l` → `1`。`wc -l < docs/research/D5/multica-reference.md` → `196`（≤ 400）。 |
| ② 七个二级标题 | 做到 | `grep -E '^## ' docs/research/D5/multica-reference.md \| tr '\n' '|'` → `## 后端\|## 前端\|## 技术栈与工程实践\|## agent 机制\|## 最值得先抄的 3 条\|## 我没能确认的\|## 取值\|`（逐字）。 |
| ③ 发现条目形状 | 做到 | `grep -cE '^### F[0-9]+ '` → `20`（∈ [12, 40]）。`diff <(grep -oE '^### F[0-9]+ ' … \| sed -E 's/[^0-9]//g') <(seq 1 20) \| wc -l` → `0`。`grep -cE '^- 来源：multica:'` / `^- 工作量：(S\|M\|L)$` / `^- 档：(执行记录\|仅声明)$` / `^- 落点：(taskboard:\|新建 \|不适用$)` 各 → `20`。 |
| ④ 来源路径真实 | 做到 | 议题原文 `while read p; do git -C /Users/happy/projects/multica-upstream cat-file -e 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:"$p" 2>/dev/null \|\| echo "MISSING $p"; done \| wc -l` → `0`。循环无 `MISSING` 行。19 条 unique 路径逐条 `cat-file -e` 皆 `e=0`（含 `.github/workflows/ci.yml`、`skills-lock.json`、`CLI_AND_DAEMON.md`）。 |
| ⑤ 落点真实或新建 | 做到 | 议题原文 `while read p; do git cat-file -e de49d53:"$p" 2>/dev/null \|\| echo "MISSING $p"; done \| wc -l` → `0`。9 条 `taskboard:` 路径（`cli/taskctl.mjs` `docs/agents/coordinator.md` `package.json` `server/app.mjs` `server/database.mjs` `web/src/api.ts` `web/src/App.tsx` `web/src/components/IssueListView.tsx` `web/src/components/TaskEditor.tsx`）皆 `e=0`。另有 `新建 .github/workflows/ci.yml`、`新建 skills-lock.json` 与 4 条 `不适用`。`git rev-parse de49d53` → `de49d53ab0ec1b1bd7a5ce04d3a20274c27e092e`。 |
| ⑥ 最值得先抄的 3 条 | 做到 | `sed -n '/^## 最值得先抄的 3 条$/,/^## 我没能确认的$/p' … \| grep -cE '^[123]\. F[0-9]+：'` → `3`。编号 F1 / F7 / F17，均在 ③ 的 1–20 内。 |
| ⑦ 我没能确认的 | 做到 | `sed -n '/^## 我没能确认的$/,/^## 取值$/p' … \| grep -cE '^- '` → `2`（≥ 1）。`grep -cxF '无'` → `0`。 |
| ⑧ 零触碰自证 | 做到 | `grep -c 7a438bd5b8bf39afd54259a7eb0971390e50a8ef` → `38`（≥ 2）。`grep -cE '^multica porcelain (前\|后)：0$'` → `2`。四行原文在 `## 取值`。本席亲跑：`git -C /Users/happy/projects/multica-upstream rev-parse HEAD > /tmp/d5r-mu-head.txt 2>&1; e=$?` → `e=0`，内容 `7a438bd5b8bf39afd54259a7eb0971390e50a8ef`；`git -C /Users/happy/projects/multica-upstream status --porcelain \| wc -l` → `0`。 |

Out of scope：

- 不改 taskboard 其他文件：`git diff --name-only 407ed6d..HEAD` 仅 `docs/research/D5/multica-reference.md`。没做错。
- 不改 `/Users/happy/projects/multica-upstream`：HEAD 仍钉 `7a438bd5…`，porcelain `0`。没做错。
- 不写 ADR、不立后续议题：全文无 `ADR-`。F 正文有少量「引入 X」建议（见局限 F8/F9），未写成实施方案。没做错。
- 不与 Linear 等其他产品比较：`grep -niE 'Linear\|Jira\|Notion\|Asana'` 空。没做错。
- docs-only：本席未 `npm install` / `npm run check`。没做错。

Worst within Spec: 无必修。建议级见「局限」（行号偏差、F15 计数、栈表数字）。

## 归店与脱敏

归店：`git diff --stat 407ed6d..HEAD` → `docs/research/D5/multica-reference.md | 196 ++++++++++++++++++++++++++++++++++` / `1 file changed, 196 insertions(+)`，恰 1 文件。实现 commit message 为 `docs(research): D5 multica reference report (#5)`。

任务书 D5-research「我已经跑过的」块数字（`5162` / `v0.4.40` / `668672` / `434802` / `1804` / `2321` / `1336` / `15903` / `2627` / `2026-09-05`）在交付物中均为 0 次；未把协调席取值写成自跑。`## 取值` 列出本机 `rev-parse` / `porcelain` / `git show <sha>:<path>` 与 `e=$?`。

脱敏：无 token / 密钥 / `ghp_` / `AKIA` / 私钥头。仓外绝对路径只有允许的 `/Users/happy/projects/multica-upstream`。`## 取值` 另有 `/tmp/d5_cmdN.log`（建议级，见局限）。

另核：`git rev-list --count 407ed6d..HEAD` = **1**；pathspec 无越界。`git branch -r --list 'origin/spec/5'` 空（未 push）。`git log --format=%b 407ed6d..HEAD | grep -ci co-authored` → **0**。`git status --porcelain` 审查开始时 0 行。

## 证据强度抽核

1. 抽 5 条「执行记录」F（`git -C /Users/happy/projects/multica-upstream show 7a438bd5…:<path> | sed -n '<line-3>,<line+3>p'`）：
   - **F1** `handler.go:571`（sed 568,574）：`func writeErrorCode` 在 571，结构化 `error`/`code` JSON 在窗内。同文件 `func writeRevisionConflict` 在 575；正文命令 `grep -n "func writeRevisionConflict"` 本席重跑 → `575:func writeRevisionConflict(...)`，与声称一致。机制在。
   - **F3** `activity.sql:18`（sed 15,21）：外层 `SELECT * FROM (` 在 **17**，内层 `SELECT * FROM activity_log` + `ORDER BY created_at DESC` / 外层 ASC 在 18–24。机制在。来源行 18 落在内层；正文声称 grep 取值为 `18:`，本席 `grep -n "SELECT \* FROM ("` → **`17:`**（行号偏差）。
   - **F7** `packages/views/navigation/types.ts:1`（sed 1,4）：`export interface NavigationAdapter {` 与 `push` / `replace` / `back`；`hash` 亦在同文件。正文 grep 取值 `1:export interface NavigationAdapter {` 本席重跑一致。
   - **F12** `knip.jsonc:10`（sed 7,13）：L10 为注释「Scoped to `files`, `dependencies`, and `unlisted`」；`"include": ["files", "dependencies", "unlisted"]` 在 **14**。机制在。正文声称 grep `'"include"'` → `10:`，本席 → **`14:`**（行号偏差）。
   - **F17** `skills-lock.json:6`（sed 3,9）：L6 `"sourceType": "github"`；`"computedHash": "063a0e6448123cd359ad0044cc46b0e490cc7964d45ef4bb9fd842bd2ffbca67"` 在 **7**，哈希与声称逐字相同。正文声称 grep 首条在 `6:`，本席 → **`7:`**（行号偏差）。
   五条路径均存在，无一「路径不存在」。

2. 抽「仅声明」F：全文仅 **F20** 一条（不足 2 条可抽）。F20 未写 `git grep` 关键词与取值；只引 `CLI_AND_DAEMON.md` 与 `server/internal/entitlement`。来源 `:208` 实为 Supported Agents 表（Codex/Copilot 等），Autopilot 节在 L850。本席 `git grep -l -i autopilot 7a438bd5… -- '*.go' | wc -l` → **174**；`cat-file` entitlement 目录存在。没写搜什么 = 建议级；档标「仅声明」相对代码量偏低（见局限）。

3. 「最值得先抄的 3 条」编号 F1 / F7 / F17 均有对应 `### F<n>`。理由：F1 落在多 agent 并发编辑冲突；F7 落在 `App.tsx` 臃肿（本席 `git show de49d53:web/src/App.tsx | wc -l` → **2627**，与「2600+」相符）；F17 落在多席位 skill 版本确定。均对着 20k 单体 / 一人 + agent / 持续拉上游，不是泛泛的「好」。

4. 「我没能确认的」抽第 1 条：该条末句写「**确认** multica 上游未收录…solutions 文档体系」，写在「我没能确认的」下 = 自相矛盾（建议级）。正文 F 节无 solutions 结论与之对撞。本席复现：`git ls-files 7a438bd5… -- docs` → **4** 行，全在 `docs/assets/`；`git grep -i solutions` → **56** 条，抽样为 `resolutions` / `ConflictResolution` 等业务词，与其描述相符。第 2 条：`packages/core/platform/core-provider.tsx` `cat-file -e` `e=0`；仓内有 `hydrateRoot` / `suppressHydrationWarning` 测试，但是 global-error 语言水合，不是 Zustand store 序列化注入——该项作为未确认可成立。

## 局限

- 行号偏差（建议级，机制均在文件内）：F2 来源 :27 为 `type Handler`，`type Bus struct` 在 **28**；F3 18 vs 17；F4 `type ReasonCode string` 在 **15** 而非 17（`runtime_offline` / `already_active` / `self_trigger_suppressed` 三字面均在同文件）；F8 `"zustand"` 在 **172** 而非 18（L18 是 exports 的 `./attachments/image-sequence`）；F9 `"@tiptap/markdown"` 在 **85** 而非 54；F10 `"react-virtuoso"` 在 **102** 而非 71；F11 `react-i18next` 在 **31** 而非 30；F12 14 vs 10；F13 `"cache-inputs"` 在 **65** 而非 32（turbo.json 确有该任务）；F14 `dorny/paths-filter@v3` 在 **39** 而非 23；F15 来源 CLAUDE.md:120 是 TypeScript strict，Conventional Commits 规则在 **252**；F16 `head -1` 实为包注释，`package repocache` 在其后；F17 7 vs 6；F19 `head -1` 为 `/**` 而非声称的 `export * from "./protocol"`（文件是 `import { … } from "./protocol"` + `export type { ThemeTokens }`）；F20 :208 vs Autopilot L850。
- F15 正文 `git log --format=%s -300 | grep -cE '^(fix|feat|docs|refactor|perf|test|chore)\('` 声称 **242**；本席在钉定 sha 重跑同命令 → **118**（python 同计数；放宽类型仍 124；Eve 作者 `-300` → **59** 与正文一致）。计数无法复现 = 建议级取值错误；CLAUDE.md:252 与 118 条 `type(scope)` 提交证明机制存在，不升 条款④。
- 栈表（非 F 来源，建议级）：multica `Next.js 15` 不实，`apps/web/package.json` 为 `"next": "^16.2.5"`；`450 份 SQL 迁移` 不实，`server/migrations` 共 **958** 文件（`.up.sql` **479** / `.down.sql` **479**）。Go 1.26（`go 1.26.6`）与 TypeScript 5.9（catalog `^5.9.3`）可核。taskboard 列写 TypeScript 5.8，`de49d53:package.json` 为 `"typescript": "^7.0.2"`。
- F19 声称的 `export * from "./protocol"` 不在 `packages/plugin-sdk/index.ts`；plugin-sdk 与 `plugin_mcp.go` 存在，该条应降「仅声明」（建议级）。F20 标仅声明但 Go 侧 autopilot 命中 174 文件，档位偏低（建议级）。
- 仅声明全仓只有 F20，抽核第 2 项不够 2 条；F20 未贴 `git grep` 关键词与取值（建议级）。
- 「我没能确认的」第 1 条自写「确认」（建议级）。
- `## 取值` 使用 `/tmp/d5_cmdN.log`，不在允许的 `/Users/happy/projects/...` 或仓内相对路径（建议级脱敏）。
- 明显遗漏的参考点（建议级，任务书点名未成 F）：inbox 通知、关系（parent / blocked_by）、附件存储、命令面板 / 快捷键 / URL 深链、agent 触发链（分配 / @提及 / 评论 → run）、GitHub / Slack / webhooks、限流。阴性结论本可写成 F。
- 未跑 `git push`。未改交付物或任何别的文件（本 VERDICT 除外）。未碰 multica-upstream 工作区。未 `npm install` / `npm run check`。
