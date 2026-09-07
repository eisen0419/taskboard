PASS
reviewedHead: 939f3e3da01774a346aa843f4bb3f748d2cece14
fixedPoint: 4c977fe51a8f21834d2e26319db9bbf015d39900
diffCommand: git diff 4c977fe51a8f21834d2e26319db9bbf015d39900..939f3e3da01774a346aa843f4bb3f748d2cece14
commits: 939f3e3 chore(knip): add knip gate to npm run check and remove seven unused exports/files/deps (#25)
implReport: /Users/happy/projects/taskboard/.scratch/d25-native/reports/impl.md
specSource: https://github.com/eisen0419/taskboard/issues/25 （验收 6 + Out of scope 4；comments 空）
conclusion: 逐条核过（逃避清单先于两轴；①②④ 的 grep / python / diff 判据本席亲跑；③ `npm run knip` 亲跑 e=0、`grep -c -F Unused` = 0；⑤ `npm run check` 亲跑尾三数 158/158/0 与 vitest 26 + 零行为 pathspec + 临时服务 47998 + `npm ls smol-toml`；⑥ 为本席 VERDICT；补充打点 1 含 `/tmp/d25-base` 基线 knip 亲跑后已 `git worktree remove`；未改交付物、未 push；未碰 47823 pid 40572 与主仓 `.data/` mtime 1788700980）

验收 6 条已判：①做到 ②做到 ③做到 ④做到 ⑤做到 ⑥做到。Out of scope 4 条均未做错。逃避与拧松清单：清单 5 项全 0。必修：无。

Standards 轴 1 条硬违反（impl report 若干字面 `grep` 未 `-F`，§3；本席 `grep -F` / 议题针计数相同）+ 0 条产品级。Spec 轴 0 条 finding。不选总赢家。

## Standards 轴

汇总：knip 6.34.0 进 `check`（`typecheck && knip && build && test`），`knip.json` 仅议题四键；七项整块删或去 `export` 留定义；lock 根直接依赖无 `smol-toml`，残留 `node_modules/smol-toml` 为 knip 的 `dev` 传递依赖 1.8.0。report 退出码无管道。无产品必修。

| 条 | 判定 | 命令 / 位点 |
|---|---|---|
| §2 验证 | 符合 | report 用 `npm run knip > /tmp/knip.log 2>&1; e=$?`、`npm run typecheck > /tmp/tc.log 2>&1; e=$?`、`npm run build > /tmp/build.log 2>&1; e=$?`、`npm run check > /tmp/check.log 2>&1; e=$?`（无管道取退出码）。新门禁先红：report 贴了 `/tmp/knip-1.log`（e≠0，Unused files/exports/types 全文）再报第二次 e=0。本席 `npm install > /tmp/npm-d25r.log 2>&1; e=$?` → **0**；`npm run knip > /tmp/d25r-knip.log 2>&1; e=$?` → **0**；`grep -c -F Unused /tmp/d25r-knip.log` → **0**（e=1，零匹配）；`npm run typecheck > /tmp/d25r-typecheck.log 2>&1; e=$?` → **0**；`npm run build > /tmp/d25r-build.log 2>&1; e=$?` → **0**（`✓ built in 418ms`）；`npm run check > /tmp/d25r-check.log 2>&1; e=$?` → **0**，`ℹ tests 158` / `ℹ pass 158` / `ℹ fail 0`，vitest `Tests  26 passed (26)`。完成态用 log 内容，不是回执。 |
| §3 本机工具陷阱 | 违反（report 若干字面无 `-F`）；本席重跑符合 | report ③ `grep -c Unused`、④ `grep -c '^export const TASK_PRIORITIES'` / `^const TASK_PRIORITIES` / `^export function taskConversations` / `^function taskConversations` / `^export interface …` / `^interface …` / `^export type LinearIconName` / `^type LinearIconName` 未一律 `-F`（议题原文部分即此针；`grep -cE` 的或针与 `^[-+] ` 为议题字面）。ugrep 下这些针无中间 `$`，计数仍可信。本席 `grep -c -F '"knip": "6.34.0"'` **1**、`'"smol-toml"'` package.json **0**、`'"knip": "knip"'` **1**、`'"check": "npm run typecheck && npm run knip && npm run build && npm test"'` **1**、`'"node_modules/knip"'` lock **1**、`Unused` HEAD knip log **0**。无 awk `==` 对非 ASCII、无 `ps \| grep`、无 `pgrep -f` 等待环。冒烟 `python3 -c` 无嵌套引号 f-string。 |
| §6 测试与断言 | 不适用（新测）；既有断言面符合 | 未增测试、未改 `test/**` 或 `web/src/**/*.test.ts*`。`test:components` 与基线逐字相同。既有 `# tests` **158**、vitest **26**。无 `.skip(` / `.only(` / `@ts-ignore` / `@ts-nocheck`。knip 门禁不是自指测试：期望来自议题表成员名 + 退出码，不是从被测函数拼期望。 |
| lock 子树 | 符合（knip 子树新增 + 根 smol-toml 移除；传递依赖见局限） | `python3 -c` 根 `packages[""].dependencies` 含 smol-toml → **False**；`node_modules/smol-toml` → **True 1.8.0**。`git diff 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD -- package-lock.json \| grep -E '^\+\s+"node_modules/' \| grep -vc 'node_modules/knip'` → **63**（见补充打点 3 / 局限：含 knip 传递 + 10 个既有键被 npm 重写的 `+` 行）。根 `devDependencies` 有 knip 6.34.0；`npm ls smol-toml` 只经 knip 一条路径。 |
| 整块删除 | 符合 | `git diff --diff-filter=D --name-only 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD` = `server/composer-reference.mjs`。`PendingAttachments.tsx` 只留 `:1` `MAX_ATTACHMENT_SIZE` / `:3` `fileKey`，无 `clipboardImages` / `PendingAttachments` 空壳或注释残体（随之无用的 `LinearIcon` / `useTaskboardI18n` / `fileSize` / `PendingAttachmentsProps` 同文件删）。`SemanticIcons.tsx:199-203` `ConversationIcon` 后直接 `RelationIcon`；文件止于 `WorkspaceWritePermissionIcon`（`:229-231`），四 icon 无注释残体。 |
| 去 export 仍留定义 | 符合 | `ComposerCompletionOption` `ComposerCompletionMenu.tsx:10`（`:21` 使用）；`LinearIconName` `LinearIcon.tsx:76`（`:79` 使用）；`TaskProcessingPresentation` `taskConversations.ts:15`（`:24` 使用）。`TASK_PRIORITIES` `shared/domain.mjs:10`（`:32` `isTaskPriority`）；`taskConversations` `taskConversations.ts:33`（`:68` 调用）。typecheck e=0，无靠别的文件改动补定义。 |
| Fowler 味道 | 判断调用，非硬违反 | 非 Shotgun Surgery（允许的 10 文件）。非 Speculative Generality（无 `ignore*` / 无 rules 降级 / 无额外依赖）。`TASK_PRIORITIES` 与 `web/src/types.ts` 各一份是原状，本 diff 未复制。 |

Worst within Standards: report 字面 `grep` 未一律 `-F`（§3）。计数仍可信。无产品缺陷。

## Spec 轴

审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD` = `4c977fe51a8f21834d2e26319db9bbf015d39900..939f3e3da01774a346aa843f4bb3f748d2cece14`（审查开始时实现 commit 恰 1）。议题 baseSha `0dd2149dd7d996c1388db17a5de9bf24c183738c` 是写单时 main；实际 merge-base 是 briefs commit `4c977fe`（含 D25 两单）。`git merge-base --is-ancestor 0dd2149dd7d996c1388db17a5de9bf24c183738c HEAD` e=0。two-dot 仍只有实现 10 文件。

| # | 判定 | 本席命令与结果 |
|---|---|---|
| ① 装与脚本 | 做到 | `grep -c -F '"knip": "6.34.0"' package.json` = **1**。`grep -c -F '"smol-toml"' package.json` = **0**。`grep -c -F '"knip": "knip"' package.json` = **1**。`grep -c -F '"check": "npm run typecheck && npm run knip && npm run build && npm test"' package.json` = **1**。`grep -c -F '"node_modules/knip"' package-lock.json` = **1**。`python3 -c 'import json;d=json.load(open("package-lock.json"));print("smol-toml" in d["packages"][""].get("dependencies",{}))'` = **False**。`python3 -c 'import json;d=json.load(open("package-lock.json"));p=d["packages"].get("node_modules/smol-toml");print(p and p.get("dev"), p and p.get("version"))'` = **True 1.8.0**。`npm ls smol-toml` = 一条 `knip@6.34.0 → smol-toml@1.8.0`。`git diff 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD -- package.json \| grep -cE '^[-+] '` = **5**（议题写预期 6、≤8 都算）。 |
| ② 配置 | 做到 | `test -f knip.json; echo $?` = **0**。`python3 -c 'import json;d=json.load(open("knip.json"));print(sorted(d))'` = `['$schema', 'entry', 'ignore', 'project']`。内容与议题 JSON 四键逐字相同。`grep -cE 'ignoreDependencies\|ignoreExportsUsedInFile\|ignoreMembers\|ignoreUnresolved\|ignoreBinaries\|"rules"' knip.json` = **0**。`ignore` 是明文四键之一，不是禁的 `ignore*`。 |
| ③ 门禁零发现 | 做到 | `npm run knip > /tmp/d25r-knip.log 2>&1; e=$?` → **0**。`grep -c -F Unused /tmp/d25r-knip.log` = **0**。log 仍印 Configuration hints (7)（议题要求的 ignore/entry 触发；e=0 且无 Unused，③ 字面已满足，见局限）。 |
| ④ 清理恰七项 | 做到 | `git diff --diff-filter=D --name-only 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD` = 恰 `server/composer-reference.mjs`。`grep -c '^export const TASK_PRIORITIES' shared/domain.mjs` = **0** 且 `grep -c '^const TASK_PRIORITIES'` = **1**。`grep -cE 'clipboardImages\|function PendingAttachments' web/src/components/PendingAttachments.tsx` = **0** 且 `grep -c '^export'` = **2**。`grep -cE 'NewConversationIcon\|ReadOnlyPermissionIcon\|FullAccessPermissionIcon\|SendIcon' web/src/components/SemanticIcons.tsx` = **0**。`grep -c '^export function taskConversations' web/src/taskConversations.ts` = **0** 且 `grep -c '^function taskConversations'` = **1**。`ComposerCompletionOption` / `LinearIconName` / `TaskProcessingPresentation` 各 export 针 **0**、去 export 定义针 **1**。`git diff --name-only 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD \| sort` 恰 10 个：`knip.json` `package-lock.json` `package.json` `server/composer-reference.mjs` `shared/domain.mjs` `web/src/components/ComposerCompletionMenu.tsx` `web/src/components/LinearIcon.tsx` `web/src/components/PendingAttachments.tsx` `web/src/components/SemanticIcons.tsx` `web/src/taskConversations.ts`。`wc -l` = **10**。 |
| ⑤ 回归 | 做到 | `npm run check > /tmp/d25r-check.log 2>&1; e=$?` → **0**（check 脚本含 knip，log 头 `typecheck && knip && build && test`）。Node 尾三数：`ℹ tests 158` / `ℹ pass 158` / `ℹ fail 0`。vitest：`Tests  26 passed (26)`。`npm run typecheck` e=**0**；`npm run build` e=**0**。`git diff --stat 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD -- server/app.mjs server/database.mjs cli/ test/ web/src/App.tsx docs/ README.md README.zh-CN.md \| wc -l` = **0**。临时 `TASKBOARD_PORT=47998` `TASKBOARD_DATA_DIR=/tmp/d25r-data`：`/health` 200 `{"status":"ok"}`；`/` **200**；`/api/inbox` **200** `{"items":[],"unreadCount":0}`。`npm ls smol-toml` 只含 `knip@6.34.0 -> smol-toml@1.8.0`。47998 pid 89364 用完已杀；47823 pid **40572** 仍 LISTEN。 |
| ⑥ 审查 | 做到 | 本文件头行 **PASS**；S3 不触发。实现 report ⑥ 标 `NOT VERIFIED: 独立 Grok 审查` 正确（改由本席做）。 |

Out of scope：

- 不删上表之外的任何东西；knip 报表外项不许 `ignore*` 糊过去：two-dot 10 文件均在允许 pathspec；`knip.json` 无 `ignore*` 豁免键、无 `rules`。没做错。
- 不因 knip 的传递依赖去改 knip 版本或手改 lock（ESCALATION-9）：`npx knip --version` = **6.34.0**；lock 仍留 `smol-toml@1.8.0` `dev: true`。没做错。
- 不动 `InlineMediaComposer.test.tsx`；不给 `test:components` 加文件；不改 knip 默认 rules；不加 knip 之外的依赖：该测试文件 two-dot 空；`test:components` 与基线逐字相同；`package.json` 新增依赖只有 knip。没做错。
- 不动 `server/app.mjs`、`server/database.mjs`、`cli/**`、`test/**`、`web/src/App.tsx`、`docs/**`、`README*`、`.teams-orca*.json`、`AGENTS.md`、`CLAUDE.md`：对这些 pathspec two-dot 空（本席 VERDICT 在 `docs/research/D25/`，不计入实现 diff）。没做错。
- 不重起 47823：审查前后 pid **40572** 仍 LISTEN；主仓 `.data/taskboard.sqlite` mtime 均为 `1788700980`。没做错。

Worst within Spec: 无。

## 补充打点

逃避清单（对 `git diff $(git merge-base origin/main HEAD)..HEAD` = `4c977fe51a8f21834d2e26319db9bbf015d39900..939f3e3da01774a346aa843f4bb3f748d2cece14`）：

1. 断言被删或放宽：`git diff --name-only … -- test/ 'web/src/**/*.test.ts*'` 空。`--diff-filter=D -- test/` 空。`# tests` = **158**。vitest **26**。无 `.skip(` / `.only(`。未命中。
2. 守卫被关：`knip.json` 仅 `$schema` / `entry` / `ignore` / `project`，无 `ignore` 以外的 `ignore*`、无 `rules`。`check` 为 `npm run typecheck && npm run knip && npm run build && npm test`，knip 后无 `|| true`。其他脚本（`test` / `test:components` / `typecheck` / `build` / `dev*` / `start` / `taskctl`）与基线相同，只加 `"knip": "knip"` 并改 `check`（议题明文）。未命中。
3. 门禁被绕：commit message 与 diff 无 `--no-verify` / `--force`。`git log --format='%s%n%b' 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD \| grep -cE -- '--no-verify\|--force'` → **0**。未命中。
4. 判据被改：`docs/briefs/**` `docs/agents/**` `docs/research/**`（实现 diff）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` `server/app.mjs` `server/database.mjs` `cli/**` `test/**` `web/src/App.tsx` `README*` 无 diff。未命中。
5. 验证被替代：report ③ 用 `npm run knip > /tmp/knip.log 2>&1; e=$?`；第一次 knip log 已原样贴（Unused files/exports/types + Configuration hints）。冒烟 `npm run knip > /tmp/knip-final.log 2>&1; echo "knip e=$?"` 仍是无管道取 `$?`。未命中。

清单 5 项全 0。

其它：

1. **第一次 knip log 与议题表一致**：impl `/tmp/knip-1.log` 的 Unused 项 = 表 1、3–7（文件 1 + 导出 8 + 类型 3），无表外 Unused。表 2 `smol-toml` 已在第一次 knip 前 `npm uninstall`，故该 log 无 Unused dependencies。Configuration hints (7) 两边都有，来自议题明文 `ignore` / `entry`，不是表外发现。本席 `git worktree add /tmp/d25-base 4c977fe51a8f21834d2e26319db9bbf015d39900`，拷 HEAD `knip.json`，装 knip 6.34.0 后 `npx knip > /tmp/knip-d25-base.log 2>&1; e=$?` → **1**。原文：
   ```
   Unused files (1)
   server/composer-reference.mjs
   Unused dependencies (1)
   smol-toml  package.json:46:6
   Unused exports (8)
   TASK_PRIORITIES                     shared/domain.mjs:10:14
   clipboardImages           function  web/src/components/PendingAttachments.tsx:10:17
   PendingAttachments        function  web/src/components/PendingAttachments.tsx:37:17
   NewConversationIcon       function  web/src/components/SemanticIcons.tsx:203:17
   ReadOnlyPermissionIcon    function  web/src/components/SemanticIcons.tsx:237:17
   FullAccessPermissionIcon  function  web/src/components/SemanticIcons.tsx:245:17
   SendIcon                  function  web/src/components/SemanticIcons.tsx:249:17
   taskConversations         function  web/src/taskConversations.ts:33:17
   Unused exported types (3)
   ComposerCompletionOption    interface  web/src/components/ComposerCompletionMenu.tsx:10:18
   LinearIconName              type       web/src/components/LinearIcon.tsx:76:13
   TaskProcessingPresentation  interface  web/src/taskConversations.ts:15:18
   Configuration hints (7)
   dist/**             knip.json  Remove from ignore
   .scratch/**         knip.json  Remove from ignore
   .data/**            knip.json  Remove from ignore
   server/index.mjs    knip.json  Remove redundant entry pattern
   cli/taskctl.mjs     knip.json  Remove redundant entry pattern
   scripts/dev.mjs     knip.json  Remove redundant entry pattern
   web/src/main.tsx    knip.json  Remove redundant entry pattern
   ```
   与议题七项表（含第 2 项 smol-toml）一致。随后 `git worktree remove --force /tmp/d25-base` e=0。
2. **保留符号仍在用**：`grep -n 'TASK_PRIORITIES' shared/domain.mjs` → `:10` 定义 + `:32` 使用各 1。`grep -n 'taskConversations(' web/src/taskConversations.ts` → `:33` 定义 + `:68` 使用。`grep -n 'fileKey\|MAX_ATTACHMENT_SIZE' web/src/components/InlineMediaComposer.tsx` ≥ 1（`:50` import，`:1696` / `:2043` / `:2054` / `:2058` 使用）；同文件 `PendingAttachments.tsx` `:1` / `:3` 仍 export。
3. **lock 只动两处子树**：`git diff 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD -- package-lock.json \| grep -E '^\+\s+"node_modules/' \| grep -vc 'node_modules/knip'` = **63**。其中仅 HEAD 新增 54 键 = knip 本体 + 传递（`formatly` `get-tsconfig` `jiti` `oxc-parser` `oxc-resolver` `strip-json-comments` `unbash` `yaml` `zod` `fd-package-json` `walk-up-path` `resolve-pkg-maps` + `@oxc-parser/binding-*` + `@oxc-resolver/binding-*` 含 wasm 嵌套 `@emnapi/*` + `oxc-parser/node_modules/@oxc-project/types`）；另 10 键是基线已有、被 npm 重写所以两边都出现 `+/-`（`@emnapi/core|runtime|wasi-threads` `@exodus/bytes` `@iconify/types|utils` `@jridgewell/sourcemap-codec` `@mermaid-js/parser` `@napi-rs/wasm-runtime` `@oxc-project/types`），不是新依赖。`node_modules/smol-toml` 仍在 lock：`dev: true`、**1.8.0**；根 `packages[""].dependencies` 无 smol-toml；`npm ls smol-toml` 只经 knip 一条路径。
4. **knip 版本与 Node**：`npx knip --version` = **6.34.0**。`node --version` = **v26.5.0**（满足 knip `^20.19.0 \|\| >=22.12.0`）。`npm ls knip` = `taskboard@1.1.22` └── `knip@6.34.0`。
5. **产物功能不变**：`npm run build` 后 `test -f dist/web/index.html` e=**0**（722 字节）。临时服务 `/` **200**、`/api/inbox` **200**、`/health` 200 `{"status":"ok"}`。
6. **diff 体积**：`git diff --stat 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD` 原文：
   ```
    knip.json                                     |    6 +
    package-lock.json                             | 1078 +++++++++++++++++++++++--
    package.json                                  |    5 +-
    server/composer-reference.mjs                 |   69 --
    shared/domain.mjs                             |    2 +-
    web/src/components/ComposerCompletionMenu.tsx |    2 +-
    web/src/components/LinearIcon.tsx             |    2 +-
    web/src/components/PendingAttachments.tsx     |   63 --
    web/src/components/SemanticIcons.tsx          |   31 -
    web/src/taskConversations.ts                  |    4 +-
    10 files changed, 1004 insertions(+), 258 deletions(-)
   ```
   除 lock 外：`9 files changed, 14 insertions(+), 170 deletions(-)`。净删 **156** ≥ 100；净增 **14** ≤ 15。未超。

另核：审查开始时 `git rev-list --count 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD` = **1**；`git diff-tree -r --numstat --no-commit-id HEAD` 原文：
```
6	0	knip.json
990	88	package-lock.json
3	2	package.json
0	69	server/composer-reference.mjs
1	1	shared/domain.mjs
1	1	web/src/components/ComposerCompletionMenu.tsx
1	1	web/src/components/LinearIcon.tsx
0	63	web/src/components/PendingAttachments.tsx
0	31	web/src/components/SemanticIcons.tsx
2	2	web/src/taskConversations.ts
```
`wc -l` = **10**，每行路径均在议题允许的 10 个文件内。`git ls-remote --heads origin spec/25` 空（未 push）。`git log --format=%b 4c977fe51a8f21834d2e26319db9bbf015d39900..HEAD \| grep -ci co-authored` = **0**。`git status --porcelain` 审查开始时 **0** 行。`git diff --summary` 0 行。

## 局限

- impl report ③④ 若干字面 `grep` 未一律 `-F`（Standards §3）；议题原文部分即无 `-F`，针无 `$`，本席 `grep -F` 计数相同。建议级。
- 终态 `npm run knip` / `npm run check` 仍打印 Configuration hints (7)（Remove from ignore / Remove redundant entry pattern）。议题 ③ 判据是 e=0 ∧ Unused=0，四键配置明文要求这些 ignore/entry，不能按 hint 删。建议级，不计 finding。
- `package-lock.json` 的 `+ "node_modules/` 且路径不含 `node_modules/knip` 计数 **63**：knip 传递依赖（`formatly` `get-tsconfig` `jiti` `oxc-parser` `oxc-resolver` `strip-json-comments` `unbash` `yaml` `zod` `fd-package-json` `walk-up-path` `resolve-pkg-maps` 及 oxc 各平台 binding）+ 10 个既有键被 npm 重写。按 brief 不计 finding。
- 工位 `node --version` = v26.5.0，议题写的开工环境是 22.23；knip 约束满足。抽查未见产品差异。
- impl knip-1.log 在卸载 smol-toml 之后采集，故缺 Unused dependencies 那一行；本席 base 工位补出，与表第 2 项一致。不计 finding。
- 未在真浏览器点看板交互；产物冒烟为 `/` `/health` `/api/inbox` HTTP 200。抽查未见，不构成产品缺陷。
