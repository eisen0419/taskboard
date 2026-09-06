# D7 · 跨家轻审 R2（复审任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/7>**（`gh issue view 7 --comments`）。再读 R1 VERDICT 原文 `/Users/happy/orca/workspaces/taskboard/spec-7/docs/research/D7/R1-VERDICT.md`（头行 `FAIL`）。本轮审 **fix-1 之后** 的 `docs/research/D7/multica-reference-2.md`。

席位：`grok`（docs-only 轻审轨）。实现 report：`/Users/happy/projects/taskboard/.scratch/d7-native/reports/fix-1.md`。固定点 = `$(git merge-base origin/main HEAD)`。审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD`。研究对象只读，钉 `7a438bd5b8bf39afd54259a7eb0971390e50a8ef`。

轻审三项、证据强度抽核、定级、逃避清单、硬规则 **逐字同** `docs/briefs/D7-review.md`。额外：抽核 0 必须覆盖 R1 点名的三处（F5「2 MB 预览上限」、未确认「735 行」「918 行」）——有命令且本席重跑取值一致才算过；仍无命令 = 必修。

产物 = `docs/research/D7/R2-VERDICT.md`（头行 `PASS` / `FAIL`），恰一个 commit：`git commit -m "docs(research): D7 R2-VERDICT (#7)" -- docs/research/D7/R2-VERDICT.md`。禁 `git add -A`。🔴 禁 `git push`。不改交付物、不改 R1-VERDICT。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d7-native/reports/review-r2.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D7/R2-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d7-native/reports/review-r2.md --json`。**`worker_done` 是最后一步，发完立即停手。**

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；verdict 只住 VERDICT 文件首行。
