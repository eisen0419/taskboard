# D7 · fix-1（R1 FAIL 返修）

> 🔴 **先读**议题 <https://github.com/eisen0419/taskboard/issues/7>（`gh issue view 7 --comments`），再读审查 VERDICT 原文 `/Users/happy/orca/workspaces/taskboard/spec-7/docs/research/D7/R1-VERDICT.md`（头行 `FAIL`，`reviewedHead = 87db745`）。**以 VERDICT 为准，不改写。** 本卡只修必修；建议级（行号偏差、URL 深链遗漏、仅声明 0 条）不要求动。

席位：`agy-flash`。分支：`spec/7`（已有实现 commit `87db745` 与 VERDICT commit `f78b553`）。允许 pathspec：**只有 `docs/research/D7/multica-reference-2.md`**。不改 `R1-VERDICT.md`、不改任何别的文件。研究对象 `/Users/happy/projects/multica-upstream` 只读，钉 `7a438bd5b8bf39afd54259a7eb0971390e50a8ef`。

## VERDICT 必修原文（不改写）

> 必修：抽核 0（正文 2 MB / 735 / 918 无 `## 取值` 命令）及 ⑧ 同款缺口。

> 正文有数字而 `## 取值` 无对应命令（**必修**）：
>
> | 正文数字 | 报告取值 | 本席 |
> |---|---|---|
> | F5「2 MB 预览上限」 | 无命令 | `server/internal/handler/file.go` L53 `const maxPreviewTextSize = 2 << 20 // 2 MB`（数字属实；cmd_7 只打到 L36 的 100 MB） |
> | 未确认「735 行日志」 | 无命令 | `hub.go` L735 `slog.Warn("ws: pre-auth frame exceeded read limit", "limit_bytes", inboundReadLimit)`（属实） |
> | 未确认「918 行警告」 | 无命令 | `hub.go` L918 `slog.Warn("ws: inbound frame exceeded read limit",`（属实） |

> **必修（抽核 0 / ⑧）**：正文 F5「2 MB 预览上限」、未确认「735 行」「918 行」三处数字无 `## 取值` 命令。本席在钉定 sha 核到数字属实，仍按「无命令 = 必修」定级。

## 你要做的

在 `## 取值` 为上述三处各补一条你自己跑的命令与取值（`cmd > log 2>&1; e=$?`，log 仍落 `/Users/happy/projects/taskboard/.scratch/d7-native/logs/`）。正文数字与路径保持可复现；需要为了对上命令而改行号/措辞时，只改交付物这一个文件。十个 `## ` 标题、F 形状、六环表、判定行、≤300 行、零触碰四行、全文 `multica:` 路径真实——议题 ①–⑧ 修完后仍须全绿。

**恰一个新 commit**（不要 amend `87db745` / `f78b553`）：`git commit -m "docs(research): D7 fix-1 补 取值 2 MB / 735 / 918 (#7)" -- docs/research/D7/multica-reference-2.md`。禁 `git add -A`。去 trailer 配方同实现单。🔴 禁 `git push`。

零触碰：开工第一条与交付前最后一条各跑一次 `git -C /Users/happy/projects/multica-upstream rev-parse HEAD` 与 `status --porcelain | wc -l`，四个取值写进 `## 取值`。

## 硬规则

1. 🔴 禁 `git push`。只碰 `docs/research/D7/multica-reference-2.md`。
2. 🔴 绝不改 `/Users/happy/projects/multica-upstream`。
3. 🔴 不许编。不 `terminal close` / `kill`；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）。
4. 🔴 docs-only：不 `npm install`、不 `npm run check`。
5. 🟡 report 头行只认 `PASS` / `FAIL` / `BLOCKED`。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d7-native/reports/fix-1.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "docs/research/D7/multica-reference-2.md" --report-path /Users/happy/projects/taskboard/.scratch/d7-native/reports/fix-1.md --json`。**`worker_done` 是最后一步，发完立即停手。**
