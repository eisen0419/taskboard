# taskboard 协调席指令面

> 2026-09-03 立（D22–D24）：本仓（复刻自 chuspeeism/dashi-taskboard v1.1.22）改造成我们自己的议题板。本仓派活走且只走 Orca 原生编排轨。角色、开窗、起场 / 盯 / 收 / 收尾、请示、问 Eisen、换窗、跨仓纪律**全部以 `/Users/happy/projects/orca-lab/docs/agents/coordinator.md` 当前版本为准**。本文件只装三类内容（orca-lab ADR-0038 决定 2）：本仓专有取值、对 orca-lab 某节的明确替换、本仓专有机制。冲突时以本文件为准。派前先读 `orca-worker-howto` skill §0 判要不要派。

## 本仓专有取值

- tracker：gh issues `eisen0419/taskboard`。`gh` 命令一律带 `--repo eisen0419/taskboard`。
- 起窗命令：`cd /Users/happy/projects/taskboard && claude --model claude-opus-5-5 --effort xhigh --permission-mode auto --advisor fable`。
- 信箱：`ORCA_MAIL_ROOT=/Users/happy/projects/taskboard/.scratch/mail`，每条 `/Users/happy/projects/orca-lab/tools/mail` 命令都前置它。收信监视：同一前缀加 `watch --me opus`。
- 值班心跳：`/Users/happy/projects/orca-lab/tools/watch/fable-duty status --coord <本窗 handle> --repo /Users/happy/projects/taskboard --ghrepo eisen0419/taskboard`。
- 席位 config：根 `.teams-orca.json`（已在 `.git/info/exclude`；Codex 三席 `codex` / `codex-deep` / `codex-luna`、grok 审查、claude-review 备用 S3，anchor 全指本仓，模型与版本钉以它为准）。建工位 `/Users/happy/projects/orca-lab/tools/lanes create --repo /Users/happy/projects/taskboard --spec <N> --lanes <实现席> --seats <审查席> --base main --config /Users/happy/projects/taskboard/.teams-orca.json`，**`--config` 必带**（`lanes` 缺省模板是 orca-lab 根 json）。`orca terminal create --command '<command 原文>'` 从根 json 抄。
- 盯场：`/Users/happy/projects/orca-lab/tools/run-watch --run <run> --since <起场 UTC>`，cwd 本仓，状态落 `.scratch/run-watch/<run>.json`。`run-create --objective` 首字写「taskboard #N」。
- 合入：顺序在差异 4。`lanes pr` / `lanes rm` 带 `--repo /Users/happy/projects/taskboard`；`gh pr merge <pr> --rebase --repo eisen0419/taskboard`。
- 任务书落点：主仓 `docs/briefs/D<N>-impl.md` / `D<N>-review.md`（随 main 入 git，无 PII；判据用的正则随单入库为 `D<N>-*-re.txt`）；审查 VERDICT 落 worktree `docs/research/D<N>/<代号>-VERDICT.md`（随 spec 分支入 git）；原生轨回执 JSON 落 `.scratch/d<N>-native/`（`.scratch/` 已排除）。
- 现查命令（只读，各自单独一条）：`git status -sb`、`git log origin/main..main --oneline`、`orca repo list`、`git worktree list`、`lsof -nP -iTCP:47823 -sTCP:LISTEN`（看板实例 pid）。

## 开窗（替换 orca-lab §2 的本仓取值）

1. 三核照 orca-lab §2 ④，命令用上面的取值。本仓没有 `coord-open`：本窗 handle 取 `$ORCA_TERMINAL_HANDLE`，为空时按 `$ORCA_PANE_KEY`（`tabId:leafId`）在 `orca terminal list --json` 里反查。
2. 读 orca-lab 自上一窗以来的增量（orca-lab ADR-0038 决定 1）：`git -C /Users/happy/projects/orca-lab log --oneline --since=<上窗交接评论的 UTC> -- docs/agents/coordinator.md CODING_STANDARDS.md docs/adr docs/briefs`，逐条读新增 commit；没有交接评论时 `--since=7.days`。
3. 接续顺序照 orca-lab §2 ②，`gh` 带 `--repo eisen0419/taskboard`。本仓没有 `docs/agents/issue-tracker.md`，「Continuation frontier」与「implement」两节读 orca-lab 的同名节。
4. D 编号照 orca-lab §2 推导命令，`R` 与 `--repo` 换成本仓。

## taskboard 差异（对照 orca-lab 逐条替换）

1. **验证入口**：`npm run check > log 2>&1; e=$?`（typecheck + vite build + node --test + vitest）。orca-lab 的 self-test / verify-invariants / mutate-* / 哈希门在本仓无对应物。冻结面 = `docs/briefs/**`、`docs/agents/**`、`AGENTS.md`、`CLAUDE.md`、`LICENSE`、`.teams-orca*.json`。
2. **工位环境**：`node_modules` 不入 git 且**不许软链主仓**（`npm install` 会顺着软链改主仓）。开工后在 spec worktree 与每个工位各跑一次 `npm install > /tmp/npm-<N>.log 2>&1; e=$?`（约 1 分钟，需网络），再亲跑一次 `npm run check` 取基线，与议题写的基线对上再派任务。
3. **本仓无 CODING_STANDARDS.md**：审查 Standards 轴对 orca-lab `CODING_STANDARDS.md` §2 / §3 / §6（验证纪律），代码风格按仓内既有风格（ESM、无框架 HTTP、`node:sqlite`、React 19 + Vite），不引入新依赖。
4. **替换 orca-lab §5「合入」**：合入确认归 Eisen。本仓无 merge-gate。审查 PASS → `lanes pr --repo /Users/happy/projects/taskboard --spec <N> --ready` → 问 Eisen（打 `ready-for-human`，停等）→ 点头后 `gh pr merge <pr> --rebase --repo eisen0419/taskboard` → 主仓 `git pull` → `lanes rm --repo /Users/happy/projects/taskboard --spec <N>`。
5. **替换 orca-lab §3「收尾」第 5 条**：本仓无 `.teams/`、无 `verify-invariants`。只核 `orca terminal list` 无 spec-N 窗 · `git worktree list` 无 spec-N · `task-list` 全 completed · `orca worktree ps` 本仓 `agents` = 0。
6. **看板服务实例**：看板跑在主仓 main 上（`TASKBOARD_HOST=127.0.0.1 TASKBOARD_TRUSTED_ORIGINS=https://happymac-mini.tailc17e94.ts.net`；端口 47823；MacBook 经 Mac mini 的 `tailscale serve` 443→47823 打开 https://happymac-mini.tailc17e94.ts.net ，缺 TRUSTED_ORIGINS 该入口写请求会 403），是 Eisen 看的板。worker 与协调席的冒烟一律用临时端口（实现席 47999、审查席 47998）与临时 DATA_DIR，不碰 47823、不碰主仓 `.data/`。动到服务代码的票合入后由协调席：停旧进程 → `git pull` → `npm install && npm run build:web` → 重起服务（带上述两个环境变量）→ `curl /health`。
7. **worker 指令面**：本仓 `AGENTS.md` 与 `CLAUDE.md` 已改成指针（指向任务书），上游的 Taskboard Delivery Workflow（认领 / E3 / taskctl 流转）不再适用；worker 若按它行事按偏离处理。
8. **库副本**：`.scratch/fixtures/taskboard-12.sqlite`（12 条议题）是旧列名的 fixture，喂新代码前先过离线列改名脚本 `.scratch/seed/migrate-2.sh`（6 列 `thread_codex_*`→`thread_agent_*`、丢 `ai_chat_*`、`codex-agent`→`agent`）；原库副本在 `.scratch/seed/`。
9. **lanes 前置**：本仓已在 Orca 注册；`core.hooksPath=tools/githooks`（本地拷 orca-lab `tools/githooks/commit-msg` 到本仓 `tools/githooks/`，`/tools/githooks/` 写在 `.git/info/exclude`，不入 git；新机器或重克隆要重做）。
10. **信任框**：主仓已在 `~/.codex/config.toml` `[projects]` 与 `~/.claude.json` projects（`hasTrustDialogAccepted=true`；Claude 按 git 主仓根记信任，worktree 不另记）。新机器首次派 Claude / Codex 席前先在本仓目录各起一次对应 CLI 接受信任框。
