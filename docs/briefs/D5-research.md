# D5 · multica 上游对 taskboard 的可参考点报告（研究任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/5>（`gh issue view 5 --comments`）——判据真源是它的「验收（可数）」8 条与「Out of scope」5 条。本卡做全部 8 条（第 ⑧ 条末句的审查由审查席做）。**

席位：`agy-flash`（研究任务族，ADR-0014 D63）。分支：`spec/5`，**baseSha = `de49d53`**（taskboard main，写单时 HEAD）。允许 pathspec：**只有 `docs/research/D5/multica-reference.md` 一个文件**（新建）。研究对象：`/Users/happy/projects/multica-upstream`（**只读**，钉 `7a438bd5b8bf39afd54259a7eb0971390e50a8ef`），它不在任何 pathspec 内，不是改造目标。

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

## 你要做的 4 件

**① 产出 A · 证据**：每条发现的 `- 来源：multica:<路径>[:<行号>]` 必须是你用 `ls` / `git ls-tree` / `git show` 在钉定 commit 上看到的；标「执行记录」的，小节正文里贴一条你跑的命令与取值（一行即可）。
🔴 判据是「**仓里有没有**」，不是「像不像 multica 会有的东西」。模型能凭记忆写出像样的路径，那不算证据。
🔴 某个机制在 README 里有、代码里找不到，**如实写「仅声明」并说明你搜了什么**（`git grep -n <关键词>` 与取值），不要硬凑路径。

**② 产出 B · 研究结论**：四节各自要回答的问题如下，每问落成一条或几条 F；不适用的也写成 F（`- 落点：不适用`），一两句说清为什么。

- `## 后端`（`server/`）：路由与 handler 组织、请求校验、错误模型、分页/过滤约定；数据模型（issues / comments / activities / agents / sessions / runs 等，看 `server/migrations` 与 sqlc queries）：活动流、通知 / inbox、关系（parent / blocked_by）、标签、状态机；实时（websocket hub 的事件类型、payload 形状、按 workspace / issue 订阅、重连补发）；鉴权分层（workspace / member / API key / agent token）最小可抄的形态；附件存储、后台任务、限流。
- `## 前端`（`apps/web` `packages/core|ui|views`）：core / ui / views 拆分与依赖方向在代码里怎么落地（`CoreProvider`、`NavigationAdapter`、pnpm catalog）；状态与数据层（用了什么库、乐观更新、WS 事件如何回灌 query cache、离线 / 重连）；列表 / 看板 / 表格视图（虚拟滚动、拖拽排序、分组、筛选与视图持久化）；议题详情与编辑器（编辑器选型、markdown 往返、@mention、附件粘贴、评论线程）；命令面板、快捷键、URL 深链；Inbox 与 agent 活动渲染（流式输出、工具调用展示、会话记录）；主题 / i18n、错误边界、测试覆盖点、lint（knip、eslint-config）。
- `## 技术栈与工程实践`：先给一张表（组件 | multica | taskboard 现状：语言与版本、web 框架、数据库与迁移、实时通道、构建、测试、lint、桌面 / 移动端、自托管）；再写 F：`AGENTS.md` / `CLAUDE.md` 的写法与约束、`docs/solutions` 的 compound 模式（frontmatter、分类、怎么被引用）、CI workflows 各 job、release 流程、e2e 范围、knip、turbo 管线、Makefile；提交纪律抽样（`git -C … log --format=%s -300` 的 conventional 类型分布、scope 命名；`--shortstat` 抽样 PR 大小；作者里是否有 bot / agent 痕迹）。
- `## agent 机制`（先读 `CLI_AND_DAEMON.md` `SELF_HOSTING_AI.md` `VISION.md`，再看代码）：agents 表与 runtime 类型（local daemon vs cloud）、agent 与 issue 的绑定；触发链（分配 / @提及 / 评论 → 谁决定启动 run → daemon 怎么拿任务 → 用什么 harness 跑 → 输出如何流回 → 完成 / 失败 / 取消回写）；权限与人审批点；`packages/plugin-sdk`、`skills-lock.json`、MCP、webhooks、GitHub / Slack 集成的形态；Inbox 通知；多 agent 协作、并发上限、用量记录。**对照 taskboard**：taskctl + `TASKBOARD_THREAD_ID` 与 `docs/agents/coordinator.md` 的「派发 → 盯场 → 验收 → PR」链，每条写清能替代或简化哪个环节，或为什么不能。

每条 F 的正文一到三句，说清「是什么模式、对 taskboard 有什么用或为什么不适用」。**不要复述 multica 的营销描述，不要与 Linear 等其他产品比较。**

**③ 零触碰自证**：开工第一条命令与交付前最后一条命令各跑一次 `git -C /Users/happy/projects/multica-upstream rev-parse HEAD` 与 `git -C /Users/happy/projects/multica-upstream status --porcelain | wc -l`，四个取值按下面格式贴进 `## 取值`。**这是你被允许对 multica-upstream 做的唯一"动作"**；其余只读 git 命令（`log` / `show` / `grep` / `blame` / `cat-file` / `ls-tree`）允许，`pull` / `checkout` / `stash` / `clean` / 任何写文件一律禁止。

**④ 按下节格式落盘并 commit。**

## 交付物格式（验收 ②③⑥⑦⑧ 逐字依赖，别自由发挥）

`docs/research/D5/multica-reference.md`，≤ 400 行：

- 一级标题一行随意。**二级标题恰七个、顺序固定、逐字**：`## 后端` `## 前端` `## 技术栈与工程实践` `## agent 机制` `## 最值得先抄的 3 条` `## 我没能确认的` `## 取值`。不要再加任何其他 `## ` 标题（`### ` 随意）。
- 每条发现的形状：

  ```
  ### F<n> <标题>
  - 来源：multica:<相对路径>[:<行号>]
  - 落点：taskboard:<相对路径>   或   - 落点：新建 <相对路径>   或   - 落点：不适用
  - 工作量：S 或 M 或 L
  - 档：执行记录 或 仅声明
  <一到三句正文；执行记录档附一条命令与取值>
  ```

  F 编号四节**连续**从 1 起，总数 **12–40**。`来源` 的路径里不能有空格或冒号（行号用 `:` 接在后面）；正文里可以再列更多路径。`落点：taskboard:` 的路径必须在 baseSha 存在（验收⑤ 会 `git cat-file -e de49d53:<path>`）。
- `## 最值得先抄的 3 条`：恰三行 `1. F<n>：<一句为什么>` `2. …` `3. …`（全角冒号），别的不写。理由要落在 taskboard 的约束上。
- `## 我没能确认的`：`- ` 起头的条目至少 1 条，按条款②写；**全文任何地方不许出现单独一行「无」**。
- `## 取值`：先四行逐字
  ```
  multica HEAD 前：7a438bd5b8bf39afd54259a7eb0971390e50a8ef
  multica HEAD 后：7a438bd5b8bf39afd54259a7eb0971390e50a8ef
  multica porcelain 前：0
  multica porcelain 后：0
  ```
  再列你跑过的每条命令与退出码（`cmd > log 2>&1; e=$?` 的 e）。

## 提交纪律

- **恰一个 commit**：`git add docs/research/D5/multica-reference.md` → `git commit -m "docs(research): D5 multica reference report (#5)" -- docs/research/D5/multica-reference.md`。禁 `git add -A` / `git commit -a`。
- 去 trailer 配方逐字：`git log -1 --format=%b > /tmp/t; grep -ci co-authored /tmp/t` → **非 0 才** `git commit --amend`。禁 `git commit-tree`。
- 自证：`git diff-tree -r --numstat --no-commit-id HEAD | wc -l` = 1，取值贴报告。
- 🔴 禁 `git push`。

## 硬规则

1. 🔴 禁 `git push`。
2. 🔴 只碰 `docs/research/D5/multica-reference.md` 一个文件，别改仓里任何别的文件。
3. 🔴 **绝不改 `/Users/happy/projects/multica-upstream` 任何文件**，唯一允许的是 ③ 那两组只读取值与只读 git 命令；不装依赖、不 build、不跑它。
4. 🔴 **不许编**（条款④）。
5. 🔴 不 `terminal close` / `kill`；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后那一次 `worker_done` 除外）；`task-list --json` 只读可跑；不动 `.teams/`。
6. 🔴 判「命令成功」一律 `cmd > log 2>&1; e=$?`，不用管道取退出码。判字面串一律 `grep -F`（本机 `grep` 是 ugrep，`$` 在 BRE 中间也是锚点）；BSD `awk` 的 `==` 对含非 ASCII 的操作数恒真。
7. 🔴 **落盘顺序**：同目录临时文件 → `mv` 成正式名 → commit → `touch .DONE` → `worker_done`。落哨兵前 `ls -la` + `head -1` 自核并贴进报告。
8. 🔴 docs-only：不 `npm install`、不 `npm run check`（验收无代码判据，跑了不加分）。
9. 🟡 report 头行只认 `PASS` / `FAIL` / `BLOCKED`。拿不准就 `BLOCKED` + 问题，别猜着做。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d5-native/reports/impl.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "<PASS|FAIL|BLOCKED>" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome <succeeded|failed> --files-modified "docs/research/D5/multica-reference.md" --report-path /Users/happy/projects/taskboard/.scratch/d5-native/reports/impl.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件住主仓 `docs/briefs/`，不在你的 pathspec 内：不是改造目标，不要修改它、不要列进 commit。本节说明与「我已经跑过的」都不得进入交付物正文。
🔴 凡是标「协调席已核」的取值都是**别人的**核验结果：交付物里不许把它们写成自己跑出来的；要用就自己重跑一遍贴自己的。

## 完成后

report 用 control / analysis 两段，`deviations` 必填（空数组 = 零偏离）——**做不成的步骤、没找到的机制、临时加的命令都要申报，申报不扣分、瞒报才扣**。证据包六字段：① 验收 ①–⑧ 逐条「命令 → 取值」② commit sha 与 baseSha ③ `git diff-tree -r --numstat --no-commit-id HEAD` 原文 ④ 零触碰四个取值 ⑤ F 总数、「最值得先抄的 3 条」的三个编号、「我没能确认的」条数 ⑥ `NOT VERIFIED`（没核到的写这里）。
