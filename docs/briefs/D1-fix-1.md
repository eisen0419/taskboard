# D1 · fix-1（R1 FAIL：清单外 `issue-composer-wiring` 整删的 3/3 抽核不成立）

> 🔴 **先读** `docs/research/D1/R1-VERDICT.md` 全文（头行 **FAIL**）与议题 <https://github.com/eisen0419/taskboard/issues/1> 评论里的 D30。判据真源是 VERDICT Spec/逃避清单第 1 项，不改写。

席位：`codex-sol`。分支：`spec/1`，**baseSha = `a26e233`**（写单时 HEAD = R1 verdict commit；计数/diff 用 `base=$(git merge-base origin/main HEAD)` = `2bbe2dd`）。允许 pathspec：**仅** `test/issue-composer-wiring.test.mjs`。

## 缺陷（协调席已独立核，你仍要自己复现）

R1 说 report 把该文件写成「3/3 用例覆盖被删面」后整删。对 `8eff36f:test/issue-composer-wiring.test.mjs`：

1. `all four issue composers request candidates…` → candidate API / 被删面 —— 成立，**可删该 `test()`**。
2. `task composer document converts only durable references…` → 唯一生产符号 `buildPersistedTaskComposerDocument`（`web/src/taskConversations.ts:39`）。`git grep` 生产调用方 **0**（只有该测试 import）。**不是** AiChat/rebind/host。D30：对象不是被删面的一字不动 → **必须保留这个 `test()`**。
3. `open in new conversation bypasses AI chat…` → `/api/local/ai/composer/rebind` + `AiChat.tsx` —— 成立，**可删该 `test()`**。

整文件删除命中逃避清单 1。N/N 抽核不成立。

## 你要做的

**①** 从 `8eff36f` 恢复 `test/issue-composer-wiring.test.mjs`，**只删**第 1、第 3 个 `test()`（及因此变成死的 `AiChat.tsx` / `api.ts` `readFile` 若第 2 个用例不用）。保留第 2 个 `test()` 与它对 `buildPersistedTaskComposerDocument` 的 import 和断言原文。
**②** `node --test test/issue-composer-wiring.test.mjs` → e=0、该文件 1/1 pass。
**③** `npm run check > /tmp/check-d1-fix1.log 2>&1; e=$?` → e=0、`# fail 0`；`# tests` 相对 `31f35ac` 只涨这 1 条（121→122）。未碰 47823 / 主仓 `.data/`。
**④** report 按 D30 表追加一行：该文件保留了哪条、删了哪两条、对应被删面。

## 不许

- 整文件再删；不 `.skip` / `.only`；不改第 2 个用例期望值。
- 不改 `31f35ac` 已删的产品面、不改其它测试、不 `git push`。
- 恰一个 commit：`git commit -m "test: keep issue-composer-wiring persisted-document case (#1)" -- test/issue-composer-wiring.test.mjs`。禁 `git add -A`。
- 去 trailer：`grep -ci co-authored` 非 0 才 amend。自证 `git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 1。

## 硬规则

1. 禁 `git push`。
2. 只改 pathspec 那 1 个文件。
3. 不 kill / 重启驱动，不动别人的窗。
4. 落盘：临时文件 → `mv` → `touch .DONE`；头行 PASS/FAIL/BLOCKED。
5. 未提交的其它工作树状态（`.orca-claims/`）不许动。
