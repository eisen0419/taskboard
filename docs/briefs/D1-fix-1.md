# D1 · fix-1 修正记录（D34 / ESCALATION-68 O2 修正记录版）

> 🔴 **ESCALATION-68 D34 应答（task-3 BLOCKED 闭环）**：answer=`/Users/happy/projects/taskboard/.teams/d1/answers/task-3.998d03dc-9423-4ff0-894e-d03158787613.md`。不复活 `buildPersistedTaskComposerDocument`。本单零代码、零 commit。

> 🔴 **先读** `docs/research/D1/R1-VERDICT.md`（头行 FAIL，不改）与议题 #1 评论 D30 + **D30-b**。

席位：`codex-sol`。分支：`spec/1`，**baseSha = `a26e233`**。允许 pathspec：**空**（不许改任何文件）。HEAD 必须仍是 `a26e233`。

## 裁决要点（不要自行发挥）

1. **不复活** `buildPersistedTaskComposerDocument`（基线零生产调用；31f35ac 连类型一并删合法）。
2. R1 必修不撤，改定性：缺陷 = impl report D30 表对该文件第 2 条**陈述不实**，不是删多了。
3. **D30-b**：清单外用例对象若是同一 commit 里作为零调用死代码删除的清单外导出，视同被删面，可删；report 必须点名该导出并贴基线调用方计数。

## 你要做的（零 commit）

**①** 不改工作树。`git rev-parse HEAD` = `a26e233fb8c91a6fe4a930b810506b99c4c88f8e`；`git status --porcelain --untracked-files=no` = 0（`?? .orca-claims/` 不许动）。
**②** 自己跑并贴取值：
```
git grep -l buildPersistedTaskComposerDocument 8eff36f -- . ':!test' | wc -l
# 必须 = 1（只有定义）
git grep -c buildPersistedTaskComposerDocument HEAD | wc -l
# 必须 = 0（或等价：HEAD 代码树 0 命中；VERDICT 叙述不算代码）
```
**③** report 头行 **PASS**。正文 = 修正后的 D30 表三行，不得再写「必须保留第 2 个 test」：

| 条 | 对象 | 处置 | 证据 |
|---|---|---|---|
| 1 | candidate API / 四 composer | 被删面，可删 | R1 已核 |
| 2 | 死导出 `buildPersistedTaskComposerDocument` | **D30-b 视同被删面，可删** | 贴上面 `git grep -l … 8eff36f -- . ':!test' \| wc -l` = **1** |
| 3 | `/api/local/ai/composer/rebind` + AiChat | 被删面，可删 | R1 已核 |

整文件三条都满足 → 整删写 N/N。
**④** 零 commit：`git rev-list --count a26e233..HEAD` = 0。禁 `git add` / `git commit` / `git push`。

## 硬规则

1. 禁 `git push`、禁任何 commit。
2. 不恢复 `web/src/taskConversations.ts` 里已删函数/类型。
3. 不 kill / 重启驱动，不动 `.orca-claims/`。
4. 落盘：临时文件 → `mv` → `touch .DONE`。
