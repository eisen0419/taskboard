# D1 · 删除 Codex 专属子系统（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/1>（`gh issue view 1 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」5 条。**

席位：`codex-sol`。分支：`spec/1`，**baseSha = `8eff36f`**（写单时 HEAD，行号与基线取自它；分支点是本任务书的 docs commit，计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：仓内除 `docs/briefs/**` `docs/agents/**` `AGENTS.md` `CLAUDE.md` `LICENSE` 之外的全部（删除型议题，见「提交纪律」）。

## 先装依赖

`npm install > /tmp/npm-d1.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，不要软链主仓）。

## 基线取值（我已跑过，你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                                   # e=0；node --test 尾三数 # tests 373 # pass 372 # fail 0；vitest「Tests 9 passed」
git ls-files | wc -l                                                          # 235
git ls-files | grep -cE "$(cat docs/briefs/D1-del-re.txt)"                    # 110（43,819 行）
git grep -lE "$(cat docs/briefs/D1-ref-re.txt)" -- server shared cli web/src scripts | wc -l   # 34
grep -cE "$(cat docs/briefs/D1-pkg-re.txt)" package.json                      # 22
grep -cE 'ai_chat_|jira|JIRA' server/database.mjs shared/domain.mjs           # 57 与 1
```

## 删除清单（验收① 的正则 = `docs/briefs/D1-del-re.txt`，逐字）

- 目录整删：`inject/` `src-tauri/` `skills/` `cloud/` `integrations/` `.codex/` `.github/`
- 根文件：`wrangler.jsonc` `rust-toolchain.toml` `PRIVACY.md`
- `scripts/`：`codex-*.mjs` `tauri-build.mjs` `prepare-tauri-app.mjs` `sign-macos-app.mjs` `preflight-macos-app.mjs` `create-macos-updater.mjs` `verify-macos-release.mjs` `verify-linux-*.mjs` `verify-updater-signature.mjs` `verify-packaged-taskctl.mjs` `migrate-to-cloud.mjs` `wrangler-cloud-adapter.mjs` `taskboard-supervisor.mjs`（保留 `dev.mjs`；它若以路径字符串起 supervisor / injector，删那几行，保留「起 server + vite」主路径）
- `server/`：`codex-app-server.mjs` `codex-slash-commands-0.139.0.json` `ai-chat.mjs` `ai-chat-process.mjs` `ai-chat-catalog.mjs` `ai-turn-owner.mjs` `cloud-config.mjs` `cloud-proxy.mjs` `jira-config.mjs` `jira-integration.mjs` `project-summary.mjs`
- `shared/`：`codex-environment.mjs` `codex-executable.mjs` `taskboard-automation.mjs`（`process-tree.mjs` / `executable-command.mjs` 删后若无引用一并删）
- `web/src/`：`components/AiChat.tsx` `components/JiraConnectionDialog.tsx` `components/ProjectAutomationMenu.tsx` `aiChatState.ts` `embeddedHost.mjs` `embeddedHost.d.mts` `revisionPolling.mjs`；`web/public/codex-*.png`
- `docs/`：`cloud-collaboration.md` `code-signing-policy.md` `windows-uninstall.md` `consumer-task-board-chatgpt-pro-review.md`
- `test/`：`ai-chat-*.test.mjs` `cloud-*.test.mjs` `codex-*.test.mjs` `inject*.test.mjs` `injector*.test.mjs` `launcher-release.test.mjs` `manage-taskboard-skill.test.mjs` `taskboard-supervisor.test.mjs` `taskboard-automation.test.mjs` `project-automation-settings.test.mjs`

清单之外确认是纯死代码的文件可一并删，report 逐个列出并说明为什么是死代码（`git grep` 零引用）。

## 🔴 我已读码的段落（省你重做；你仍要自己复现，report 里贴自己的取值）

**① `server/app.mjs:20-33`** import 了 codex-executable / codex-environment / ai-chat / ai-chat-catalog / cloud-config / cloud-proxy / jira-config / jira-integration / project-summary。路由判断 `grep -nE 'pathname === "/api/local/(ai|jira|cloud|host-runtime|codex)' server/app.mjs` 命中 10 处（`/api/local/ai*` `/api/local/jira-connection*` `/api/local/cloud-session` `/api/local/host-runtime` `/api/local/codex-thread-progress`），连同 handler 与 `/api/device-workspaces` 里只服务 Codex 宿主的分支一起删。`resolveHost` / `resolvePort`、`/health`、`/api/meta`、`/api/client-storage`、`/api/events`、`/api/projects*`、`/api/tasks*`、`/api/comments*`、`/api/attachments*`、readme 路由保留。
**② `cli/taskctl.mjs:10`** import cloud-config 的 `normalizeCloudUrl`；`cloud login/status/logout` 与 `usesCompanionControl`（`:322`）分支删；`project map` 若只服务云端 companion 一并删（读码定，report 写明判断）。
**③ `web/src/App.tsx`** 引用计数：AiChat 18、Jira 51、revision 11、embeddedHost 1；`ProjectAutomationMenu`（右上「自动化」按钮）与 `DashboardView` 的 `getProjectSummary` AI 摘要块要摘掉；`api.ts` 里 ai / jira / cloud / summary 请求函数与 `types.ts` 对应类型一并删；`styles.css` 里只服务这些组件的样式块删（`grep -n 'ai-chat\|jira' web/src/styles.css`）。
**④ `server/database.mjs`** `ai_chat_threads / ai_chat_runs / ai_chat_events` 三表建表与方法（`grep -n ai_chat` 定位，`:598` 起）、`project_summaries` 表与方法（随 project-summary 删）、JIRA 项目特判（`grep -n -i jira`）删。既有库里这些表留着不碍事，SQLite 不检查多余表。
**⑤ `package.json`** devDependencies 删 `@tauri-apps/cli` `wrangler` `miniflare`；scripts 删 `codex` `codex:inject` `codex:daemon` `codex:refresh` `app:*` `tauri` `cloud:*` `test:cloud`，`build` 改成只 `vite build --config web/vite.config.ts`（去掉 `codex-injector.mjs --refresh-if-running`）。改后 `npm install` 让 lock 同步。
**⑥ `scripts/dev.mjs`** 无本地 import；`grep -n 'supervisor\|injector' scripts/dev.mjs` 定位后删相关分支。

## 你要做的 6 件（= 议题验收 1–6）

**①** 按删除清单 `git rm -r`。**②** 删引用（上①–④）并让 `npm run typecheck` 过。**③** `package.json` + lock。**④** database / domain 去 ai_chat / jira / project_summaries。**⑤** `npm run check` 绿。**⑥** 冒烟：临时目录 `D=$(mktemp -d)`，`cp /Users/happy/projects/taskboard/.scratch/fixtures/taskboard-12.sqlite $D/taskboard.sqlite`，`CODEX_TASKBOARD_HOST=127.0.0.1 CODEX_TASKBOARD_PORT=47999 CODEX_TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &`，记 pid，六步取值（health / `/api/tasks` = 12 / project list / root html）后 `kill <pid>`。

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# fail 0`；vitest 9 passed；`# tests` 前后两数 |
| `server/**` `cli/**` | 冒烟六步原样贴（端口 47999） |
| `web/**` | `dist/web/index.html` 存在；冒烟 `curl -s http://127.0.0.1:47999/ \| grep -c 'id="root"'` ≥ 1 |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`base=$(git merge-base origin/main HEAD)`；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- 保留的测试文件（`test/` 里清单之外的）一个不删、一条断言不改、不加 `.skip` / `.only`；`# fail 0`。
- 看板 / 列表 / 甘特 / 项目文档四视图：不动 `BoardColumn` / `IssueListView` / `GanttView` / `ProjectReadmeView` 的行为；只删挂点。
- 会话绑定（threadBinding）与 actor 归属逻辑保留；`taskctl issue create` 仍要求 `CODEX_THREAD_ID`（改名是 #2 的事）。
- `/api/events` SSE 与 tasks / projects / comments / attachments / readme 路由形状不变。
- 不改任何命名（产品名、`CODEX_*`、`thread_codex_*`、文案里的 Codex）。

## 验收口径

- 计数一律「前 → 后」并列贴：110 → 0、34 → 0、22 → 0、58 → 0、373 → N（N = 保留用例数）。
- 判「通过」一律 `cmd > log 2>&1; e=$?`；字面串 `grep -F`；数量 `grep -c`；本机 `grep` 是 ugrep。

## 出单自检

- 任务书文件名命中 `BUDGET_BRIEF_CLASS_RULES`（`D1-impl.md`）。
- baseSha 与计数基点分开：行号与基线取写单时 HEAD `8eff36f`，数 commit / 取 diff / co-authored 以 `$(git merge-base origin/main HEAD)` 为基。

## 提交纪律

- **恰一个 commit**。本议题例外允许：`git add -A -- . ':(exclude)docs/briefs' ':(exclude)docs/agents' ':(exclude)AGENTS.md' ':(exclude)CLAUDE.md' ':(exclude)LICENSE'` → `git commit -m "refactor: remove Codex-only subsystems (#1)"`。commit 后 `git show --stat HEAD | grep -cE '^ (docs/briefs|docs/agents|AGENTS\.md|CLAUDE\.md|LICENSE)'` 必须 = 0。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁真提交落地前 `git reset`。
- 自证非空：`git diff-tree -r --numstat --no-commit-id HEAD | wc -l` 取值贴报告（预期 ≥ 110）。

## 硬规则

1. 🔴 禁 `git push`。
2. 🔴 只动 pathspec 内的文件；`docs/briefs/**` `docs/agents/**` `AGENTS.md` `CLAUDE.md` `LICENSE` `.data/**` `.teams-orca*.json` 一律不碰。
3. 🔴 冒烟只用端口 47999 与临时目录；**绝不**连 47823、绝不动主仓 `.data/`（Eisen 正在看的板）。
4. 🔴 绝不 `orca terminal close` / `kill` 别的进程，不动 `.teams/`，不动不是你的窗；自己起的冒烟服务用完自己停（记 pid，`kill <pid>`）。
5. 🔴 `npm install` 只在自己的工位跑；不软链主仓 `node_modules`。
6. 🔴 落 `.DONE` 前按 `~/.agents/skills/code-review/SKILL.md` 的 Standards + Spec 两轴自查，report 里逐条回执。
7. 🔴 落盘顺序：先写同目录临时文件 → `mv` 成正式名 → 才 `touch .DONE`；`.DONE` 后立即停手，返工随新 attempt。
8. 🔴 判退出码不用管道；判字面串 `grep -F`。
9. 🟡 report 头行只认 `PASS` / `FAIL` / `BLOCKED`；拿不准就 `BLOCKED` + 问题。
10. 🔴 本仓 `AGENTS.md` 已换成指针；不要按上游「Taskboard Delivery Workflow」认领 / 流转 / 扩范围。

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节与「我已读码的段落」不得进入交付物正文。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。正文 = **证据包**五字段：① 验收逐条「命令 → 取值」② commit sha 与 baseSha ③ 测试文件相对 `$(git merge-base origin/main HEAD)` 的 `git diff --stat` 与一句为什么删 ④ `npm run check` 整体结果（node --test 三数、vitest）⑤ `NOT VERIFIED` 列表（空也写「无」）；另附被删文件数与行数、`diff-tree --numstat` 取值、`grep -ci co-authored` 取值、清单外额外删除的文件与理由。
