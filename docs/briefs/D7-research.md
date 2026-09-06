# D7 · multica 补 D5 缺的 7 个面（研究任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/7>（`gh issue view 7 --comments`）——判据真源是它的「验收（可数）」8 条与「Out of scope」5 条。本卡做全部 8 条（第 ⑧ 条末句的审查由审查席做）。再读 main 上的 `docs/research/D5/multica-reference.md`（上一张卡的 20 条 F），本卡只补它漏的 7 个面，不重写。**

席位：`agy-flash`（研究任务族，ADR-0014 D63）。分支：`spec/7`，**baseSha = `ebbcd47`**（taskboard main，写单时 HEAD）。允许 pathspec：**只有 `docs/research/D7/multica-reference-2.md` 一个文件**（新建）。研究对象：`/Users/happy/projects/multica-upstream`（**只读**，钉 `7a438bd5b8bf39afd54259a7eb0971390e50a8ef`），它不在任何 pathspec 内，不是改造目标。

## 这张卡在测什么（先看清，别搞错对象）

本卡有**两个独立的产出**，缺一不可：

- **产出 A = 证据**：每条发现挂 multica 里**真实存在**的路径（钉定 commit 上 `git cat-file -e` 能过），执行记录档的还要有你自己跑出的取值（行号、`grep -c` 计数、`go.mod` / `package.json` 里的版本串）。
- **产出 B = 研究结论**：对 taskboard 有没有用、落点在哪、多大工作量。判断标准是「对 taskboard 这个 20k 行、一人 + agent 维护、要持续拉上游的 Node + SQLite 单体有没有用」，不是 multica 本身好不好。

🔴 **阴性结论（「规模不匹配」「栈不匹配」「我们用不上」「代码里没找到 README 说的那个机制」）是完全合格的交付，不是失败。** 它直接决定 Fable 后面立不立后续议题。**不要为了让报告好看去编。**

## 🔴 四条强制条款（ADR-0014 D63，每张研究卡逐字带上，不许删改）

**① 机制证据分三档交，结论只能挂前两档。**

| 档 | 什么算 | 能支撑的结论 |
|---|---|---|
| **执行记录** | 运行时真的跑过：日志/事件流里有该动作的开始与完成记录，带取值 | 「本机可用」 |
| **仅声明** | 运行时自报「我有这个能力」（工具清单、`--help`、能力协商），但本轮**没被调用过** | 「声明存在，可用性未验证」 |
| **模型自述** | agent 在回答正文里说的 | **什么都支撑不了**，只能当线索 |

🔴 **「声明」不等于「跑得通」。** 一个名字出现在工具清单里，只证明它被声明了。结论句里必须逐个标明是哪一档。

**② 「我没能确认的」这一节不许写「无」。**

两种合格写法，二选一：
- 逐条列出你拿不准的，每条一句现象 + 你试过什么 + 卡在哪（有原文错误串就原样贴）；
- 或者写「我核了 X、Y、Z，全部确认」，并**附上每条的核法**（命令 + 取值）。

🔴 空着比编内容好；写「无」而实际有没确认的，是本类卡最重的错——研究卡测的就是**能不能分清「确认过的」和「没确认的」**。做不成的步骤（被沙箱挡、命令不存在、页面打不开）一律进这一节，**即使你已在别处如实提过**。

**③ 每个工具名 / 事实各自挂真源，官方文档与本机运行时自报分开写。**

- 官方页面上的 → 给 URL + **原文摘引**。
- 本机运行时自报的（工具清单、`--help`、版本串）→ 写明是「本机 `<CLI>` 运行时自报」并给取自哪个文件/事件，**不许挂到某个文档页上**。
- 一个结论里两种来源都有，就拆成两条分别挂。
- 🔴 **找不到来源就写「官方文档未收录」**，不要为了补一个来源去猜页面地址。

**④ 编 URL 或编工具名 = 本卡直接判失败。** 拿不到就写「未找到」/「取不到」。

### 本卡的对应关系（补充说明，不改上面四条）

- **执行记录** = 你在钉定 commit 上用命令取到的：`git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:<path> | sed -n 'a,bp'`、`grep -n` / `grep -c`、`wc -l`、`go.mod` / `package.json` / `pnpm-workspace.yaml` 里的版本串。
- **仅声明** = multica 仓内 README / CLAUDE.md / AGENTS.md / docs / VISION 声称有，但你没在代码里核到对应实现。
- **模型自述** = 你凭记忆知道的 multica、Go、Next.js 或任何库的行为。不许挂结论，只能当线索去核。
- 条款③④ 的「URL」在本卡对应 `multica:<相对路径>[:<行号>]`；「官方文档」= multica 仓内文档；「本机运行时自报」= 你跑命令得到的取值。**编路径 = 判失败**（验收④ 会逐条 `cat-file -e`）。

## 🔴 我已经跑过的（协调席已核；省你重做，你仍要自己复现并贴自己的取值）

```
git -C /Users/happy/projects/multica-upstream rev-parse HEAD            → 7a438bd5b8bf39afd54259a7eb0971390e50a8ef
git -C /Users/happy/projects/multica-upstream rev-list --count HEAD     → 5162
git -C /Users/happy/projects/multica-upstream tag --sort=-v:refname | head -1   → v0.4.40
git -C /Users/happy/projects/multica-upstream log -1 --date=short --format=%ad  → 2026-09-05
git -C /Users/happy/projects/multica-upstream status --porcelain | wc -l → 0
ls /Users/happy/projects/multica-upstream                                → AGENTS.md CLAUDE.md CLI_AND_DAEMON.md SELF_HOSTING*.md VISION.md apps packages server docs e2e examples deploy docker scripts turbo.json pnpm-workspace.yaml knip.jsonc skills-lock.json …
ls apps → desktop docs mobile web ；ls packages → core eslint-config plugin-sdk tsconfig ui views ；ls server → cmd internal migrations pkg sqlc.yaml go.mod go.sum
find server -name '*.go' | xargs wc -l | tail -1                         → 668672（含 sqlc 生成代码）
find packages apps -name '*.ts' -o -name '*.tsx' | grep -v node_modules | xargs wc -l | tail -1 → 434802
```

taskboard 侧（baseSha de49d53）：`wc -l server/app.mjs server/database.mjs cli/taskctl.mjs` → 1804 / 2321 / 1336；`web/src` ts+tsx 15903 行，`web/src/App.tsx` 2627 行，无路由库；路由 `/api/projects` `/api/tasks` `/api/events`（SSE）`/api/meta` `/api/client-storage`；表 `projects tasks comments attachments task_activities task_relations project_readmes`；无鉴权，只有 Host/Origin 白名单（`server/app.mjs:157` `assertTrustedNetworkRequest`）；CLI 写入带 `TASKBOARD_THREAD_ID` 归属；协调流程见 `docs/agents/coordinator.md`。


**上一张卡（D5）审查席抓到的错，本卡不许再犯**（协调席已核）：`git -C … log --format=%s -300 | grep -cE '^(fix|feat|docs|refactor|perf|test|chore)\('` 真值 **118**（D5 写 242）；`apps/web/package.json` 的 `"next"` 是 `^16.2.5`（D5 写 15）；`server/migrations` 共 958 文件、`.up.sql` **479**（D5 写 450）；`packages/plugin-sdk/index.ts` 首行是注释块不是 `export * from "./protocol"`（D5 当执行记录写）。规则：**正文里每个数字、版本串、行号都来自你在钉定 commit 上跑的命令，命令与取值写进 `## 取值`；审查席会逐条重跑，对不上 = 必修。**

## 你要做的 4 件

**① 产出 A · 证据**：每条发现的 `- 来源：multica:<路径>[:<行号>]`、六环表第二列、正文里任何 `multica:<路径>` 都必须是你用 `ls` / `git ls-tree` / `git show` 在钉定 commit 上看到的（验收④ 对全文所有 `multica:` 路径逐条 `cat-file -e`）；标「执行记录」的，小节正文里贴一条你跑的命令与取值。
🔴 判据是「**仓里有没有**」。某个机制 README 里有、代码里找不到，**如实写「仅声明」并写你 `git grep -n` 了什么关键词、取值多少**；全仓都没有就写「未找到」并写成阴性 F。

**② 产出 B · 七个面各一节，每节至少一条 F**（形状见下节；可引用 `D5 F<n>`，不重写 D5 已有结论）：

- `## inbox 通知`：inbox / notification 表与写入点（哪些事件产生通知、给谁、已读态、批量）、前端 inbox 视图怎么消费；对 taskboard 的意义 = 人怎么知道 agent 完成 / 卡住（现在靠协调席读屏与信箱）。
- `## 议题关系`：parent / sub-issue / blocked_by / relates 的表结构与约束（环检测、级联状态）、API 与 UI；对照 taskboard 已有的 `task_relations` 表（`server/database.mjs`），差在哪。
- `## 附件存储`：上传路径（本地盘 / 对象存储）、去重、大小与类型限制、与评论 / 议题的绑定、URL 签名；对照 taskboard 的 `attachments` / `comment_attachment_revision` 表。
- `## 命令面板与深链`：command palette 的实现（库、注册方式）、快捷键表、URL 状态（议题 / 视图 / 筛选是否可深链、Electron 与 Web 是否同一套）；对照 taskboard 无路由库、`App.tsx` 手写 URL 状态。
- `## agent 触发链`：**先给六环表**（触发 / 准入 / 领取 / 执行 / 流回 / 回写，每环一个 multica 路径 + 一句），再写 F，再写 `### 对照 taskboard` 小节：把六环逐一对到 `docs/agents/coordinator.md` 的派发 → 盯场 → 验收 → PR 链，每条一句「能替代 / 简化哪一环」或「为什么不能」（≥3 条）。
- `## 集成`：先三行判定 `- GitHub：<执行记录|仅声明|未找到>` `- Slack：…` `- webhooks：…`（判执行记录的要在同节 F 里给路径），再写 F：PR / 分支联动、消息推送、出站 webhook 的事件面与鉴权。
- `## 限流`：先一行判定 `- 限流：<执行记录|仅声明|未找到>`，再写 F：HTTP / agent run / WebSocket 层各有没有限流、用什么（中间件、令牌桶、按 workspace）；对 taskboard 单人本地场景是否有意义（阴性也是 F）。

每条 F 正文一到三句，说清「是什么模式、对 taskboard 有什么用或为什么不适用」。**不要复述 multica 的营销描述，不要与其他产品比较。**

**③ 零触碰自证**：开工第一条命令与交付前最后一条命令各跑一次 `git -C /Users/happy/projects/multica-upstream rev-parse HEAD` 与 `git -C /Users/happy/projects/multica-upstream status --porcelain | wc -l`，四个取值按下面格式贴进 `## 取值`。**这是你被允许对 multica-upstream 做的唯一"动作"**；其余只读 git 命令允许，`pull` / `checkout` / `stash` / `clean` / 任何写文件一律禁止。

**④ 按下节格式落盘并 commit。**

## 交付物格式（验收 ②③⑥⑦⑧ 逐字依赖，别自由发挥）

`docs/research/D7/multica-reference-2.md`，≤ 300 行：

- 一级标题一行随意。**二级标题恰十个、顺序固定、逐字**：`## inbox 通知` `## 议题关系` `## 附件存储` `## 命令面板与深链` `## agent 触发链` `## 集成` `## 限流` `## 最值得先抄的 3 条` `## 我没能确认的` `## 取值`。不要再加任何其他 `## ` 标题（`### ` 随意，但 `### 对照 taskboard` 必须逐字出现在 `## agent 触发链` 节内）。
- 每条发现的形状（与 D5 相同）：

  ```
  ### F<n> <标题>
  - 来源：multica:<相对路径>[:<行号>]
  - 落点：taskboard:<相对路径>   或   - 落点：新建 <相对路径>   或   - 落点：不适用
  - 工作量：S 或 M 或 L
  - 档：执行记录 或 仅声明
  <一到三句正文；执行记录档附一条命令与取值>
  ```

  F 编号七节**连续**从 1 起，总数 **7–30**，每个面至少 1 条。`multica:` 后的路径里不能有空格、冒号、竖线、括号（行号用 `:` 接在后面）。`落点：taskboard:` 的路径必须在 baseSha `ebbcd47` 存在。
- 六环表（在 `## agent 触发链` 节，F 之前）：

  ```
  | 环节 | 位置 | 一句话 |
  |---|---|---|
  | 触发 | multica:<路径>[:<行号>] | … |
  | 准入 | multica:<路径> | … |
  | 领取 | multica:<路径> | … |
  | 执行 | multica:<路径> | … |
  | 流回 | multica:<路径> | … |
  | 回写 | multica:<路径> | … |
  ```

  首列六个词逐字、各恰一行；某一环在代码里找不到就写 `multica:<你搜过的最接近的文件>` 并在一句话里写「未找到，搜了 <关键词>」。
- 判定行：`## 集成` 节开头三行 `- GitHub：<执行记录|仅声明|未找到>` `- Slack：…` `- webhooks：…`；`## 限流` 节开头一行 `- 限流：<执行记录|仅声明|未找到>`。全角冒号，行尾不加别的字。
- `## 最值得先抄的 3 条`：恰三行 `1. F<n>：<一句为什么>` `2. …` `3. …`（全角冒号）。
- `## 我没能确认的`：`- ` 起头的条目至少 1 条，按条款②写；**全文任何地方不许出现单独一行「无」**。
- `## 取值`：先四行逐字
  ```
  multica HEAD 前：7a438bd5b8bf39afd54259a7eb0971390e50a8ef
  multica HEAD 后：7a438bd5b8bf39afd54259a7eb0971390e50a8ef
  multica porcelain 前：0
  multica porcelain 后：0
  ```
  再列你跑过的每条命令与退出码（`cmd > log 2>&1; e=$?` 的 e），**正文里出现的每个计数 / 版本串在这里都要有它的命令与取值**。log 落 `/Users/happy/projects/taskboard/.scratch/d7-native/logs/`（`mkdir -p`），不用 `/tmp`。

## 提交纪律

- **恰一个 commit**：`git add docs/research/D7/multica-reference-2.md` → `git commit -m "docs(research): D7 multica reference report part 2 (#7)" -- docs/research/D7/multica-reference-2.md`。禁 `git add -A` / `git commit -a`。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`。
- 自证：`git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 1，取值贴报告。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。
2. 🔴 只碰 `docs/research/D7/multica-reference-2.md` 一个文件，别改仓里任何别的文件。
3. 🔴 **绝不改 `/Users/happy/projects/multica-upstream` 任何文件**，唯一允许的是 ③ 那两组只读取值与只读 git 命令；不装依赖、不 build、不跑它。
4. 🔴 **不许编**（条款④）。
5. 🔴 不 `terminal close` / `kill`；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后那一次 `worker_done` 除外）；`task-list --json` 只读可跑；不动 `.teams/`。
6. 🔴 判「命令成功」一律 `cmd > log 2>&1; e=$?`，不用管道取退出码。判字面串一律 `grep -F`（本机 `grep` 是 ugrep，`$` 在 BRE 中间也是锚点）；BSD `awk` 的 `==` 对含非 ASCII 的操作数恒真。
7. 🔴 **落盘顺序**：同目录临时文件 → `mv` 成正式名 → commit → `touch .DONE` → `worker_done`。落哨兵前 `ls -la` + `head -1` 自核并贴进报告。
8. 🔴 docs-only：不 `npm install`、不 `npm run check`（验收无代码判据，跑了不加分）。
9. 🟡 report 头行只认 `PASS` / `FAIL` / `BLOCKED`。拿不准就 `BLOCKED` + 问题，别猜着做。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d7-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "docs/research/D7/multica-reference-2.md" --report-path /Users/happy/projects/taskboard/.scratch/d7-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不是改造目标，不要修改它、不要列进 commit。本节说明与「我已经跑过的」都不得进入交付物正文。
🔴 凡是标「协调席已核」的取值都是**别人的**核验结果：交付物里不许把它们写成自己跑出来的；要用就自己重跑一遍贴自己的。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）——**做不成的步骤、没找到的机制、临时加的命令都要申报，申报不扣分、瞒报才扣**。证据包六字段：① 验收 ①–⑧ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 零触碰四个取值 ⑤ F 总数与七个面各几条、六环表六行、四条判定行、「最值得先抄的 3 条」的三个编号、「我没能确认的」条数 ⑥ `NOT VERIFIED`（没核到的写这里）。
