# D1 · R2 复审（fix-1：`issue-composer-wiring` 不得整删）

> 🔴 **只审不改。** 先读 `docs/research/D1/R1-VERDICT.md`（头行 FAIL）与 `docs/briefs/D1-fix-1.md`。实现 report：`.teams/d1/reports/task-3.*.md`。

席位：`grok`。固定点 = `$(git merge-base origin/main HEAD)`。对象 = `git diff $(git merge-base origin/main HEAD)..HEAD`。产物 = `docs/research/D1/R2-VERDICT.md`，头行 PASS/FAIL。恰一个 commit，pathspec 只含该文件。禁 `git push`。

## 必须核（与 impl 单同一命题）

1. `test/issue-composer-wiring.test.mjs` **在树里**；`git show 8eff36f:test/issue-composer-wiring.test.mjs` 的第 2 个 `test()`（`buildPersistedTaskComposerDocument`）断言原文仍在；第 1、第 3 个 `test()` 不在。
2. `git grep -n buildPersistedTaskComposerDocument -- web/src` 生产调用方仍只有定义；该测试仍 import 它。
3. `node --test test/issue-composer-wiring.test.mjs` e=0、1 passed；`npm run check` e=0、`# fail 0`、`# tests` = 122（相对 31f35ac 的 121 只涨 1）。
4. `git diff --name-only a26e233..HEAD` 只有 `test/issue-composer-wiring.test.mjs`（加 verdict 自己那个文件）。
5. 逃避清单第 1 项：清单外整删已撤回；未 `.skip`/`.only`；未改第 2 个用例期望。
6. 恰 1 个 fix commit、未 push、`grep -ci co-authored` 取值原样贴、`git status --porcelain --untracked-files=no` 0 行。

R1 已判做到的验收 ①–⑥ 与 OOS 不许回退。report 头行 = **PASS（审查做完了，无论 verdict）**。
