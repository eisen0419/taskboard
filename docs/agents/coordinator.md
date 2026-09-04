# taskboard 协调席指令面

> 2026-09-03 Eisen 拍板 D22–D24：本仓（复刻自 chuspeeism/dashi-taskboard v1.1.22）改造成我们自己的议题板。三层分工与 orca-lab 同构：worker（codex-sol / grok / claude-review 席位窗）→ 协调席（本文件的读者，现为 Grok #1）→ Fable（立项与裁决）。角色、审查环、验收纪律、收尾、请示动作全部以 `/Users/happy/projects/orca-lab/docs/agents/coordinator.md` 为准（先通读它），本文件只列 taskboard 差异。派活配方 = `orca-worker-howto` skill。

本文件从 D23 起用新词：议题（gh issue）、立项（写清议题与任务书）、执行（一个议题在一支 spec 分支上的一轮派工，`d<N>`）、任务（Orca task：实现 / 审查 / 修复）、工位（一个席位在本次执行里的 worktree + 窗，`tools/lanes` 的 lane）、验收（协调席核证据包）、合入确认（Eisen 合 PR）、请示（ESCALATION 文件名不变）。orca-lab 那份仍是旧词，对照表见 orca-lab #157 议题正文；#157 合入后见 orca-lab `CONTEXT.md`「弃用词」节。

## 分工边界（灰度期）

- 议题与任务书由 Fable 出，你不写议题不写任务书；有错按 orca-lab §5③ 请示，不自行改。
- 你做：开工（lanes / 建队 / 建任务 / 驱动 / Monitor）、盯场、验收亲验、审查环转发、关议题、`lanes pr`、收尾。
- 代码 commit 审查 PASS 后才 push；PR 合入是 Eisen 唯一的合入确认。

## taskboard 差异（对照 orca-lab 逐条替换）

1. **验证入口**：`npm run check > log 2>&1; e=$?`（typecheck + vite build + node --test + vitest）。orca-lab 的 self-test / verify-invariants / mutate-* / 哈希门在本仓无对应物。冻结面 = `docs/briefs/**`、`docs/agents/**`、`AGENTS.md`、`CLAUDE.md`、`LICENSE`、`.teams-orca*.json`。
2. **议题真源** = gh issues `eisen0419/taskboard`（2026-09-03 起开 issues；#1 #2 为首批，#2 阻塞于 #1）。
3. **任务书落点** = 主仓 `docs/briefs/D<N>-impl.md` / `D<N>-review.md`（随 main 入 git，无 PII；判据用的正则随单入库为 `D<N>-*-re.txt`）；审查 VERDICT 落 worktree `docs/research/D<N>/<代号>-VERDICT.md`。
4. **席位 config**：根 `.teams-orca.json`（已在 `.git/info/exclude`；codex-sol 实现 + grok 审查 + claude-review 备用 S3，anchor 全指本仓）。开工：`python3 /Users/happy/projects/orca-lab/tools/lanes create --repo /Users/happy/projects/taskboard --spec <N> --lanes codex-sol --base main`。
5. **工位环境**：`node_modules` 不入 git 且**不许软链主仓**（`npm install` 会顺着软链改主仓）。开工后在 spec worktree 与每个工位各跑一次 `npm install > /tmp/npm-<N>.log 2>&1; e=$?`（约 1 分钟，需网络），再亲跑一次 `npm run check` 取基线，与议题写的基线对上再派任务。
6. **工具绝对路径**：`/Users/happy/projects/orca-lab/tools/{teams,teams-orca,team-monitor,lanes,mail}`；驱动 `cd /Users/happy/projects/taskboard` 后按 howto 起（脱协调窗进程树），`.teams/` 账本在主仓根（已排除）。
7. **Monitor 跨仓注入**：`TM_DRIVER_ROOT=/Users/happy/projects/taskboard TM_TEAM_JSON=.teams/<team>/team.json zsh /Users/happy/projects/orca-lab/tools/team-monitor <team> <gen>`。
8. **收尾判据**：同 ziping 差异 7（journal 终态 `cleanup-exit-confirmed` / `unconfirmed`；席位窗清空以 `orca terminal list` 复核为唯一判据）。
9. **本仓无 CODING_STANDARDS.md**：审查 Standards 轴对 orca-lab `CODING_STANDARDS.md` §2 / §3 / §6（验证纪律），代码风格按仓内既有风格（ESM、无框架 HTTP、`node:sqlite`、React 19 + Vite），不引入新依赖。
10. **看板服务实例**：主仓 main 上跑着看板（现 `CODEX_TASKBOARD_HOST=127.0.0.1`，#2 后改 `TASKBOARD_HOST`；端口 47823；pid 记在 ziping SESSION-STATE），是 Eisen 正在看的板。worker 与你的冒烟一律用临时端口（实现席 47999、审查席 47998）与临时 DATA_DIR，不碰 47823、不碰主仓 `.data/`。#1 / #2 合入后由你：停旧进程 → `git pull` → `npm install && npm run build:web` → 重起服务 → `curl /health`。
11. **请示通道**：同 ziping 差异 10（信箱）：`.scratch/ESCALATION-<n>.md`（本仓编号从 1 起，`.scratch/` 已排除）→ `tools/mail send --from opus --to fable --kind escalation --attach /Users/happy/projects/taskboard/.scratch/ESCALATION-<n>.md --terminal <Fable-handle>`。
12. **进度记录**：写 ziping `.scratch/SESSION-STATE.md` 自己的进度段（协调席跨仓共用一份）。
13. **任务书必含提交纪律节**（同 ziping 差异 13）。#1 是删除型议题，任务书明文允许 `git add -A -- . ':(exclude)…'`，这是该议题的例外不是新默认。
14. **worker 指令面**：本仓 `AGENTS.md` 与 `CLAUDE.md` 已改成指针（指向任务书），上游的 Taskboard Delivery Workflow（认领 / E3 / taskctl 流转）不再适用；worker 若按它行事按偏离处理。
15. **库副本**：`.scratch/fixtures/taskboard-12.sqlite`（12 条议题）给 #1 验收④用；#2 合入后库删了重灌，由你按 ziping SESSION-STATE 里的灌入清单重建（或让 Fable 重灌）。
16. **lanes 前置（d1 实证，2026-09-04）**：`tools/lanes` 要求目标仓已在 Orca 注册（`orca repo add --path /Users/happy/projects/taskboard`，一次性）且 `core.hooksPath=tools/githooks`；本仓无 `tools/`，做法 = 本地拷 orca-lab 的 `tools/githooks/commit-msg`（剥 co-author trailer）到本仓 `tools/githooks/`，并把 `/tools/githooks/` 写进 `.git/info/exclude`，不入 git。新机器或重克隆要重做这两步。
17. **Codex 新目录信任框（d1 实证，2026-09-04）**：Codex 对没进过 `~/.codex/config.toml` `[projects."<path>"] trust_level = "trusted"` 的目录首启会停在「local config, hooks, and exec policies to load › 1. Yes, continue」提示，preamble 送不进去，驱动只会反复重起（attempt 涨、`preamble-resend-uncertain terminal_not_writable`）而不报错。开工前把主仓、`spec/<N>` worktree 与各工位路径按该文件现有条目形状追加；已停住的窗 `orca terminal send --terminal <h> --text "1" --enter` 解锁后读屏核 preamble 送达。claude 席的信任对话框同理（见 ziping SESSION-STATE「Fable 决策窗首启」）。
