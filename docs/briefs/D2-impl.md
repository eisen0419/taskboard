# D2 · 去 Codex 命名（实现任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/2>（`gh issue view 2 --comments`）——判据真源是它的「验收（可数）」6 条与「Out of scope」4 条，以及 Fable 的勘正评论（④ 的列名与 `CODEX_AGENT_ACTOR` 按勘正为准）。**

席位：`codex-sol`。分支：`spec/2`，**baseSha = `fb5850f`**（#1 合入后 main，写单时 HEAD，行号与基线取自它；计数与 diff 用 `base=$(git merge-base origin/main HEAD)`）。允许 pathspec：仓内除 `docs/briefs/**` `docs/agents/**` `docs/research/**` `AGENTS.md` `CLAUDE.md` `LICENSE` `.teams-orca*.json` `.data/**` `.scratch/**` 之外的全部（含 `README*.md` `package.json` `package-lock.json`）。

## 先装依赖

`npm install > /tmp/npm-d2.log 2>&1; e=$?`（约 1 分钟；`node_modules` 不入 git，不要软链主仓）。

## 基线取值（我已在 #1 树上跑过，你仍要自己复现一遍再动手）

```
npm run check > /tmp/check0.log 2>&1; e=$?                                              # e=0；node --test 尾三数 # tests 121 # pass 121 # fail 0；vitest「Tests 9 passed」
git ls-files | wc -l                                                                     # 131
git grep -il codex -- . ':!docs/briefs' ':!docs/agents' ':!docs/research' | wc -l                          # 28（验收①）
git grep -lE 'CODEX_[A-Z_]+' -- server shared cli web/src scripts test | wc -l           # 11（验收③）
grep -c '"name": "taskboard"' package.json                                               # 0（验收②）
grep -c '"name": "codex-taskboard"' package-lock.json                                    # 2（第 2 行与第 8 行，npm install 会同步）
```

## 改名表（机械，全仓一致；左 → 右，大小写各自对应）

| 类 | 旧 | 新 |
|---|---|---|
| 环境变量（server / cli / test） | `CODEX_TASKBOARD_<X>`，X ∈ HOST · PORT · DATA_DIR · URL · RUNTIME_FILE · WSL_RUNTIME_FILE · TRUSTED_ORIGINS · LISTEN_FD · INSTANCE_TOKEN · INSTANCE_SECRET · VERSION | `TASKBOARD_<X>` |
| 归属 | `CODEX_THREAD_ID` | `TASKBOARD_THREAD_ID` |
| JS 常量（不是环境变量，议题原文写错） | `CODEX_AGENT_ACTOR`（`server/app.mjs:37`、`web/src/actors.ts:3`） | `AGENT_ACTOR` |
| actor 身份 | id `codex-agent` / name `Codex Agent`（含 `server/database.mjs:605` `:754` 两条迁移 SQL 字面量、`web/src/types.ts:15` `AssigneeTarget`、`IssueListView.tsx:152-155` 下拉项） | id `agent` / name `Agent` |
| 数据库列（`server/database.mjs` 19 处 ×3） | `thread_codex_project_id` / `thread_codex_project_kind` / `thread_codex_host_id` | `thread_agent_project_id` / `thread_agent_project_kind` / `thread_agent_host_id` |
| JSON 字段 / 变量 | `codexProjectId` / `codexProjectKind` / `codexHostId` | `agentProjectId` / `agentProjectKind` / `agentHostId` |
| 类型名 | `CodexProjectIdentity` / `CodexThreadBinding` | `AgentProjectIdentity` / `AgentThreadBinding` |
| CLI 选项（`cli/taskctl.mjs:84-106` `:168-169` `:829-871`） | `--binding-codex-project-id` / `-kind` / `--binding-codex-host-id` | `--binding-agent-project-id` / `-kind` / `--binding-agent-host-id` |
| 启动器握手（`server/app.mjs:1108-1141`、`test/server.test.mjs:112-115`） | 头 `x-codex-taskboard-challenge` / `x-codex-taskboard-proof`；`product: "codex-taskboard"` | `x-taskboard-challenge` / `x-taskboard-proof`；`product: "taskboard"` |
| Windows 传输（`cli/taskctl.mjs:1214` `:1223`） | appdata 目录 `"Codex Taskboard"`；标记 `__CODEX_TASKBOARD_CURL_RESPONSE__` | `"Taskboard"`；`__TASKBOARD_CURL_RESPONSE__` |
| 包名 | `"name": "codex-taskboard"`（`package.json` + lock） | `"name": "taskboard"`（lock 靠 `npm install` 同步，不手改） |
| 产品名与文案 | `Codex Taskboard`（`server/index.mjs:15` `:22`、`cli/taskctl.mjs` 帮助、`test/cli.test.mjs:107`）；`web/index.html:10` meta description；「Codex 会话 / 任务 / 线程 / 项目」；`i18n` 英文同改 | `Taskboard`；「会话 / 任务 / 线程 / 项目」 |
| CSS（`web/src/styles.css` 19 处 + 对应 TSX） | `.codex-link-row` / `.codex-context` / `.codex-sidebar-expand-button` / `--codex-titlebar-left-inset` | `.thread-link-row` / `.thread-context` / `.sidebar-expand-button` / `--titlebar-left-inset` |
| 图标 | `LinearIcon.tsx:24` 键 `codexSidebarExpand`；`SemanticIcons.tsx:211` `CodexResumeIcon` | `sidebarExpand`；删（见下节，若仍有引用改 `ThreadIcon`） |
| 测试 | 用例标题、临时目录前缀 `codex-taskboard-test-` / `-readme-test-`、局部变量 `codexOriginResult` 等 | 去 codex 字样，用例数不变 |
| 注释 | `LinearIcon.tsx:3`、`taskConversations.ts:70` 等提到 Codex 的注释 | 改写或删 |

## 🔴 两处不是改名而是删（Fable 裁，写在议题勘正评论里；验收①「全仓 0」优先于 Out of scope「不删功能」，因为这两处是 Codex 桌面应用专属入口，#1 漏删）

**A. Codex 全局状态读取**（`server/app.mjs:878-914` `codexProjectRoot` / `latestThreadCwd` / `resolveProjectWorkspace`，`:985` `CODEX_HOME`，`:1004-1007` `codexStatePath` / `codexProcessesPath` 两选项，`:1301-1302` `:1316-1337` 路由取参）：删 `codexProjectRoot`、`latestThreadCwd`、`CODEX_HOME`、两路径选项；`resolveProjectWorkspace` 收缩为 `project.workspacePath ?? null`（或直接内联）；`development-contexts` 路由只认 `workspacePath` 查询参数（`codexProjectId` / `codexThreadId` 两参数删，未知参数仍 400）；`web/src/api.ts:213-228` `listDevelopmentContexts` 去掉这两个入参，`App.tsx:987` 调用点同步。`test/server.test.mjs:349-380` 那条用例**改写不删**：不再写 fixture 文件，断言 ① `GET /api/projects/local/development-contexts` → 200 且 `workspacePath` 为 `null`、`contexts` 为 `[]`；② 带 `?workspacePath=<临时目录>` → 200 且原样返回。用例数仍 121。

**B. Codex App 入口**（`web/src/App.tsx:1689-1702` `openThread` / `openLegacyLocalThread` 的 `codex://threads/` 深链与「请在 Codex App 中打开」文案；`TaskDetail.tsx:330-352` 的「复制终端命令」按钮 `codex resume <id>`；`TaskConversationMenu.tsx:144` 状态角标 `Codex`）：深链改为把 `threadId` 写进剪贴板（复用 `App.tsx:1680` 附近既有的剪贴板 helper，提示 `text("会话 ID 已复制。", "Thread ID copied.")`，local / remote 两种 kind 同一行为）；「复制终端命令」按钮删，「查看对话」按钮改名「复制会话 ID」/ "Copy thread ID" 并走同一复制逻辑（`onOpenThread` 链保留名字或改 `onCopyThreadId`，二选一，report 写明）；角标改 `text("会话", "Thread")`；`CodexResumeIcon` 无引用即删。

## 你要做的 6 件（= 议题验收 1–6）

**①** 按改名表 + A/B 改到 `git grep -il codex -- . ':!docs/briefs' ':!docs/agents' ':!docs/research' | wc -l` = 0。**②** 包名 + `npm install` 同步 lock。**③** 环境变量全换 `TASKBOARD_*`。**④** 列 / 字段 / 类型 / CLI 选项换 agent。**⑤** 产品名与文案。**⑥** `README.md` 与 `README.zh-CN.md` 按议题⑥ 重写（各 ≤ 80 行：一句是什么、本地运行三行、taskctl 三例、`TASKBOARD_HOST` 与 `TASKBOARD_THREAD_ID` 两条注意、上游致谢一行 chuspeeism/dashi-taskboard，MIT）。

## 冒烟（端口 47999，全新临时目录，不用 fixture——旧库列名已变，不做迁移）

```
D=$(mktemp -d)
TASKBOARD_HOST=127.0.0.1 TASKBOARD_PORT=47999 TASKBOARD_DATA_DIR=$D node server/index.mjs > $D/server.log 2>&1 &  pid=$!
sleep 2; curl -s http://127.0.0.1:47999/health                                                                       # {"status":"ok"}
head -1 $D/server.log                                                                                                # 含 Taskboard listening，grep -ci codex = 0
TASKBOARD_THREAD_ID=t TASKBOARD_URL=http://127.0.0.1:47999 node cli/taskctl.mjs project list --json | grep -c '"projects"'      # 1
TASKBOARD_THREAD_ID=t TASKBOARD_URL=http://127.0.0.1:47999 node cli/taskctl.mjs issue create --project local --title t --json | grep -c '"creatorId": *"agent"'   # 1
TASKBOARD_URL=http://127.0.0.1:47999 node cli/taskctl.mjs issue create --project local --title t --json > $D/nothread.out 2> $D/nothread.err; e=$?   # e=2；grep -c USAGE_ERROR $D/nothread.err = 1；grep -ci codex $D/nothread.err = 0
TASKBOARD_THREAD_ID=t TASKBOARD_URL=http://127.0.0.1:47999 node cli/taskctl.mjs issue create --project local --title b --json --thread-id th --binding-thread-id th --binding-agent-project-id p --binding-agent-project-kind local --binding-agent-host-id local 2>/dev/null | grep -c '"agentProjectId"'   # 若 create 不收 binding 选项则改用 move（见 taskctl 帮助），取值贴 report；不成写 NOT VERIFIED 并附错误
curl -s http://127.0.0.1:47999/ | grep -c '<title>Taskboard</title>'                                                # 1
kill $pid
```

## 改了什么 → 最少要跑什么

| 动到 | 最少验证（全部贴 report，缺一不算做完） |
|---|---|
| 任何文件 | `npm run check > /tmp/check.log 2>&1; e=$?` → e=0；`# tests 121 # pass 121 # fail 0`；vitest 9 passed |
| `server/**` `cli/**` | 冒烟全段原样贴（端口 47999） |
| `web/**` | `dist/web/index.html` 存在；冒烟最后一条 = 1 |
| `package.json` | `git diff $base..HEAD -- package-lock.json \| grep -cE '^[-+] ' ` 取值贴（预期 ≤ 4：只有 name 两处） |
| 任何 commit | `git status --porcelain` 与 `git diff --summary` 均 0 行；`base=$(git merge-base origin/main HEAD)`；`git log --format=%b $base..HEAD \| grep -ci co-authored` 取值原样贴 |

## 不许退化的既有断言

- 测试文件一个不删、用例一条不删（`# tests` 121 → 121；A 那条是改写）；断言期望值只允许按改名表换字面量，不许改判定形状，不加 `.skip` / `.only`；report 列「文件:行 → 旧期望 → 新期望 → 对应改名表哪一行」。
- API 路由路径一个不改（含 `/api/local/*` 若仍存在、`/api/projects/*/development-contexts`）；SSE 与 tasks / projects / comments / attachments / readme 形状除字段改名外不变。
- 状态 / 优先级枚举与中文文案不动；默认标签表不动；`bin.taskctl` 不动。
- 看板 / 列表 / 甘特 / 项目文档四视图行为不动；只改名与 B 那两个按钮。
- 不加依赖；不做旧库迁移代码。

## 验收口径

- 计数一律「前 → 后」并列贴：28 → 0、11 → 0、0 → 1（package.json）、2 → 0（lock 里 codex-taskboard）、121 → 121、9 → 9。
- 判「通过」一律 `cmd > log 2>&1; e=$?`；字面串 `grep -F`；数量 `grep -c`；本机 `grep` 是 ugrep。

## 出单自检

- 任务书文件名命中 `BUDGET_BRIEF_CLASS_RULES`（`D2-impl.md`）。
- baseSha 与计数基点分开：行号与基线取写单时 HEAD `fb5850f`，数 commit / 取 diff / co-authored 以 `$(git merge-base origin/main HEAD)` 为基。

## 提交纪律

- **恰一个 commit**。本议题改名面宽，允许：`git add -A -- . ':(exclude)docs/briefs' ':(exclude)docs/agents' ':(exclude)docs/research' ':(exclude)AGENTS.md' ':(exclude)CLAUDE.md' ':(exclude)LICENSE' ':(exclude).data' ':(exclude).scratch' ':(exclude).orca-claims'` → `git commit -m "refactor: rename Codex naming to Taskboard (#2)"`。commit 后 `git show --stat HEAD | grep -cE '^ (docs/briefs|docs/agents|docs/research|AGENTS\.md|CLAUDE\.md|LICENSE|\.data/|\.scratch/|\.orca-claims/)'` 必须 = 0。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`、禁真提交落地前 `git reset`。
- 自证非空：`git diff-tree -r --numstat --no-commit-id HEAD | wc -l` 取值贴报告（预期 ≥ 28）。

## 硬规则

1. 🔴 禁 `git push`。
2. 🔴 只动 pathspec 内的文件；`docs/briefs/**` `docs/agents/**` `docs/research/**` `AGENTS.md` `CLAUDE.md` `LICENSE` `.data/**` `.scratch/**` `.teams-orca*.json` 一律不碰。
3. 🔴 冒烟只用端口 47999 与临时目录；**绝不**连 47823、绝不动主仓 `.data/`（Eisen 正在看的板）、绝不动 `.scratch/fixtures/`。
4. 🔴 绝不 `orca terminal close` / `kill` 别的进程，不动 `.teams/`，不动不是你的窗；自己起的冒烟服务用完自己停（记 pid，`kill <pid>`）。
5. 🔴 `npm install` 只在自己的工位跑；不软链主仓 `node_modules`。
6. 🔴 落 `.DONE` 前按 `~/.agents/skills/code-review/SKILL.md` 的 Standards + Spec 两轴自查，report 里逐条回执。
7. 🔴 落盘顺序：先写同目录临时文件 → `mv` 成正式名 → 才 `touch .DONE`；`.DONE` 后立即停手，返工随新 attempt。
8. 🔴 判退出码不用管道；判字面串 `grep -F`。
9. 🟡 report 头行只认 `PASS` / `FAIL` / `BLOCKED`；拿不准就 `BLOCKED` + 问题。
10. 🔴 本仓 `AGENTS.md` 已换成指针；不要按上游「Taskboard Delivery Workflow」认领 / 流转 / 扩范围。

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不要修改、不要列进 commit。本节与「两处不是改名而是删」的裁决理由不得进入交付物正文。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）。正文 = **证据包**五字段：① 验收逐条「命令 → 取值」② commit sha 与 baseSha ③ 测试文件相对 `$(git merge-base origin/main HEAD)` 的 `git diff --stat` 与「旧期望 → 新期望」表 ④ `npm run check` 整体结果（node --test 三数、vitest）⑤ `NOT VERIFIED` 列表（空也写「无」）；另附 `diff-tree --numstat` 取值、`grep -ci co-authored` 取值、A/B 两处各改成了什么。
