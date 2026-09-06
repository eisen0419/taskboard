PASS
reviewedHead: 04531e4807bef9b18f2cba65e6dcb98c3292b610
fixedPoint: 935c954c80844d08b9095212033e9282eba739c2
diffCommand: git diff 935c954c80844d08b9095212033e9282eba739c2..HEAD
commits: 87db745 docs(research): D7 multica reference report part 2 (#7); f78b553 docs(research): D7 R1-VERDICT (#7); 04531e4 docs(research): D7 fix-1 补 取值 2 MB / 735 / 918 (#7)
implReport: /Users/happy/projects/taskboard/.scratch/d7-native/reports/fix-1.md
specSource: https://github.com/eisen0419/taskboard/issues/7 （验收 8 + Out of scope 5；comments 空）
r1Verdict: docs/research/D7/R1-VERDICT.md（头行 FAIL；必修 = 抽核 0 / ⑧：正文 2 MB / 735 / 918 无 `## 取值` 命令）
conclusion: 逐条核过（①–⑧ 命令与取值均为本席亲跑；抽核 0 全量复现且覆盖 R1 点名三处；抽核 1–4 为抽核；未改交付物、未改 R1-VERDICT、未跑 npm、未 push）

验收 8 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到 ⑦做到 ⑧做到。Out of scope 5 条均未做错。逃避与拧松清单：清单 5 项全 0（第 4 项 R1-VERDICT 落在审查范围，议题 ⑧ 明文要求，见下豁免）。R1 必修已补：cmd_23 / cmd_24 / cmd_25 本席重跑取值一致。

## Spec 轴

`<file>` = `docs/research/D7/multica-reference-2.md`。审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `935c954..04531e4`。本轮审 fix-1 之后的交付物（HEAD = `04531e4`）。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 交付物与 commit | 做到 | `test -f docs/research/D7/multica-reference-2.md && echo EXISTS` → `EXISTS`。`git diff-tree -r --numstat --no-commit-id HEAD` → `3	0	docs/research/D7/multica-reference-2.md`；`… \| wc -l` → `1`。`wc -l < docs/research/D7/multica-reference-2.md` → `169`（≤ 300）。`git rev-list --count 935c954..HEAD` → `3`（实现 + R1-VERDICT + fix-1；fix-1 本身恰 1 文件，见另核）。 |
| ② 十个二级标题 | 做到 | `grep -E '^## ' … \| tr '\n' '|'` → `## inbox 通知\|## 议题关系\|## 附件存储\|## 命令面板与深链\|## agent 触发链\|## 集成\|## 限流\|## 最值得先抄的 3 条\|## 我没能确认的\|## 取值\|`（逐字）。 |
| ③ 七面 F + 形状 | 做到 | 七面 `sed -n '/^## <本节>$/,/^## <下一节>$/p' … \| grep -cE '^### F[0-9]+ '` → inbox **2** / 议题关系 **1** / 附件存储 **2** / 命令面板与深链 **2** / agent 触发链 **2** / 集成 **3** / 限流 **1**。`grep -cE '^### F[0-9]+ '` → `13`（∈ [7, 30]）。`diff <(grep -oE '^### F[0-9]+ ' … \| sed -E 's/[^0-9]//g') <(seq 1 13) \| wc -l` → `0`。来源 / 工作量 / 档 / 落点 各 → `13`。 |
| ④ 来源路径真实 | 做到 | 议题原文 while 循环 `wc -l` → `0`。unique 文件 14 条逐条 `cat-file -e 7a438bd5…:<path>` 皆 `e=0`。 |
| ⑤ 落点真实或新建 | 做到 | 议题原文 while 循环 `wc -l` → `0`。`docs/agents/coordinator.md` `server/app.mjs` `server/database.mjs` 在 `ebbcd47` 皆 `e=0`。 |
| ⑥ 六环表 + 对照 | 做到 | `sed -n '/^## agent 触发链$/,/^## 集成$/p' … \| grep -E '^\| (触发\|准入\|领取\|执行\|流回\|回写) \|' \| grep -c 'multica:'` → `6`。`sed -n '/^### 对照 taskboard$/,/^## 集成$/p' … \| grep -cE '^- '` → `3`。 |
| ⑦ 集成与限流判定 | 做到 | `grep -cE '^- (GitHub\|Slack\|webhooks\|限流)：(执行记录\|仅声明\|未找到)$'` → `4`。同节 F10–F13 给路径。 |
| ⑧ 收尾 + 零触碰 | 做到 | `^[123]\. F[0-9]+：` → `3`；未确认 `^- ` → `2`；`grep -cxF '无'` → `0`；`grep -c 7a438bd5b8bf39afd54259a7eb0971390e50a8ef` → `36`（≥ 2）；`grep -cE '^multica porcelain (前\|后)：0$'` → `2`。本席亲跑：`git -C /Users/happy/projects/multica-upstream rev-parse HEAD` → `e=0` / `7a438bd5b8bf39afd54259a7eb0971390e50a8ef`；`status --porcelain \| wc -l` → `0`。R1 缺口三处现有 cmd_23/24/25 且取值一致（抽核 0）。 |

Out of scope：

- 不改 taskboard 其他代码 / 不改 #5 报告：实现与 fix-1 的 `diff-tree` 皆仅 `<file>`。`f78b553..HEAD` 仅 `<file>`。没做错。
- 不改 `/Users/happy/projects/multica-upstream`：HEAD 仍钉 `7a438bd5…`，porcelain `0`。没做错。
- 不写 ADR、不立后续议题：全文无 `ADR-`。没做错。
- 不与其他产品比较：`grep -niE 'Linear|Jira|Notion|Asana'` 空。没做错。
- 不重写 #5 的 20 条。没做错。
- docs-only：本席未 `npm install` / `npm run check`。没做错。

Worst within Spec: 无必修。建议级见「局限」（与 R1 同款质量项，非本轮必修）。

## 归店与脱敏

归店：实现 / fix-1 pathspec 只有 `<file>`。`git show --stat 04531e4` → `docs/research/D7/multica-reference-2.md | 3 +++` / `1 file changed, 3 insertions(+)`。`git diff --stat 935c954..HEAD` 另含 `docs/research/D7/R1-VERDICT.md`（109 行），是 R1 审查席产物。议题 ⑧ 原句：「审查席 grok 轻审 VERDICT `docs/research/D7/R1-VERDICT.md`」。本席未改 R1-VERDICT、未改交付物。

任务书 D7-research「我已经跑过的」块数字（`5162` / `v0.4.40` / `668672` / `434802` / `1804` / `2321` / `1336` / `15903` / `2627` / `2026-09-05`）在交付物中均为 0 次。

脱敏：无 token / 密钥 / `ghp_` / `AKIA`。仓外绝对路径只有 `/Users/happy/projects/multica-upstream` 与 `/Users/happy/projects/taskboard/.scratch/d7-native/logs/`。

另核：`git rev-list --count 935c954..HEAD` = **3**（87db745 实现、f78b553 R1-VERDICT、04531e4 fix-1）。议题 ①「实现 commit 恰一个」在 R1 已核；本轮追加的 fix-1 `diff-tree` = 1 文件，不升必修。`git branch -r --list 'origin/spec/7'` 与 `git ls-remote --heads origin spec/7` 皆空（未 push）。`git log --format=%b 935c954..HEAD | grep -ci co-authored` → **0**。`git status --porcelain` 审查开始时 0 行。

## 证据强度抽核

0. **计数复现（全量，含 R1 点名三处）**：`## 取值` 现 25 条。cmd_1–22 本席重跑与 R1 一致（cmd_21/22 `e=1` 空输出；其余声称行号均准）。R1 点名三处：

| R1 缺口 | 取值命令 | 报告 | 本席 |
|---|---|---|---|
| F5「2 MB 预览上限」 | cmd_23 `…file.go \| grep -n "const maxPreviewTextSize"` | `53:const maxPreviewTextSize = 2 << 20 // 2 MB` e=0 | **同** e=0 |
| 未确认「735 行」 | cmd_24 `…hub.go \| grep -n "pre-auth frame exceeded read limit"` | e=0；实现 log `735:slog.Warn("ws: pre-auth frame exceeded read limit", "limit_bytes", inboundReadLimit)` | **同** e=0；sed 732–738 机制在 |
| 未确认「918 行」 | cmd_25 `…hub.go \| grep -n "inbound frame exceeded read limit"` | e=0；实现 log `918:slog.Warn("ws: inbound frame exceeded read limit",` | **同** e=0；sed 915–921 机制在 |

`hub.go` `cat-file -e` `e=0`（无 `multica:` 前缀，不进 ④ 循环，不是编路径）。正文其余行号 / 100 MB / 六环行号均有 cmd_3–20 对应且本席取值一致。抽核 0 过。

1. 抽 5 条「执行记录」F（`show 7a438bd5…:<path> \| sed -n '<line-3>,<line+3>p'`）：
   - **F1** `001_init.up.sql:110`：`CREATE TABLE inbox_item (` 在 110。机制在。
   - **F5** `file.go:36`：`maxUploadSize = 100 << 20 // 100 MB` 在 36；cmd_23 补到 L53 `2 << 20 // 2 MB`。机制在。
   - **F7** `definitions.ts:8`：`export type ShortcutActionId =` 在 8。`ShortcutActionDefinition` 仍在 **52**（建议级行号，同 R1）。
   - **F8** `task.go:3473`：`ClaimTask` 在 3473。机制在。
   - **F13** `ratelimit.go:19`：Redis Lua `INCR`/`EXPIRE` 在 19。机制在。
   五条路径均存在。

2. 抽「仅声明」F：全文 **0** 条（不足 2）。建议级，同 R1。

3. 「最值得先抄的 3 条」F1 / F5 / F7 均有 `### F<n>`。理由仍落在协调席读屏、`app.mjs` 小表面、`App.tsx` 快捷键，不是泛泛的「好」。

4. 「我没能确认的」抽第 1 条：WS 每连接频率限流。F13 是 HTTP Redis 限流；cmd_21 `message_rate` 本席 `e=1`。与「没确认」一致，非自相矛盾。第 2 条 `issue_dependency` 前端：cmd_22 本席 `e=1`。

## 局限

- R1 建议级仍在、本轮未要求改：六环「执行」`execenv.go:1` 的 `head -1` 是包注释；F7 来源 :8 vs `ShortcutActionDefinition` :52；F6 `command.tsx:20` 是 cmdk 原语，「任务跳转 / 主题切换」不在 ±3 窗；F12 HMAC 在 `autopilot_webhook.go` 不在 `webhook_delivery.go:26`；`## 命令面板与深链` 无 URL 深链 F；仅声明 0 条不够抽 2。
- 逃避清单 4：`git diff --name-only 935c954..HEAD` 含 `docs/research/D7/R1-VERDICT.md`。豁免 = 议题验收 ⑧ 原句要求该 VERDICT；fix-1 未改它。
- 未跑 `git push`。未改交付物或 R1-VERDICT。未碰 multica-upstream 工作区。未 `npm install` / `npm run check`。
