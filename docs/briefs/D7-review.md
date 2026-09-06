# D7 · 跨家轻审（审查任务）

> 🔴 **先读议题 <https://github.com/eisen0419/taskboard/issues/7>（`gh issue view 7 --comments`）——Spec 轴的判据真源是它的「验收」8 条与「Out of scope」5 条。**

席位：`grok`（实现者是 `agy-flash`，跨家；**docs-only 轻审轨**，ADR-0013 第 4 条 / ADR-0014 D64：Spec 轴 + 归店 + 脱敏，不跑 Standards 轴）。
实现 report：`/Users/happy/projects/taskboard/.scratch/d7-native/reports/impl.md`，从它取实现 commit sha。
固定点 = `$(git merge-base origin/main HEAD)`。审查范围 = `git diff $(git merge-base origin/main HEAD)..HEAD`。
研究对象 `/Users/happy/projects/multica-upstream` 只读，钉 `7a438bd5b8bf39afd54259a7eb0971390e50a8ef`；你也只能对它跑只读 git 命令。

本议题 docs-only，不需 `npm install` / `npm run check`。

## 轻审三项

**Spec 轴**：逐条对议题「验收」8 条，判「做到 / 半做 / 没做 / 做错」，每条贴你自己跑的命令与取值。①–⑧ 的判据命令议题里已写死，**逐字跑**，③ 的七个面各一次 `sed -n` 计数、④⑤ 的 `while` 循环、⑥ 六环表与对照计数、⑦ 四条判定行都要跑（不是看实现 report 抄数）；⑧ 末句的「协调席亲跑 rev-parse / porcelain」你也跑一次。先把条数写在 verdict 开头。Out of scope 5 条做了也算做错，尤其：动了 multica-upstream（`git -C /Users/happy/projects/multica-upstream status --porcelain | wc -l` ≠ 0 或 HEAD 变了）、改了 taskboard 其他文件、写了实施方案细节或 ADR、与其他产品比较。

**归店**：交付物只在 `docs/research/D7/multica-reference-2.md`，`git diff --stat $(git merge-base origin/main HEAD)..HEAD` 恰 1 文件；「我已经跑过的」协调席取值没有被写成实现席自己跑的（任务书 D7-research「我已经跑过的」块里的数字若原样出现在报告，核报告 `## 取值` 里有没有对应的自跑命令）。

**脱敏**：无 token / 密钥；路径只允许 `/Users/happy/projects/...` 与仓内相对路径。

## 证据强度抽核（研究卡专有，必做）

0. **计数复现（本卡必修项）**：正文里出现的每个数字、版本串、行号，按报告 `## 取值` 节给的命令在钉定 commit 上**逐条重跑**（不是抽样），取值不一致 = 必修；正文有数字而 `## 取值` 没有对应命令 = 必修（D5 的 242 / Next.js 15 / 450 三处就是这样漏的）。把「命令 → 报告取值 → 你的取值」列成表放进 VERDICT。
1. 抽 **5 条**标「执行记录」的 F：按 `- 来源：multica:<path>[:<line>]` 自己 `git -C /Users/happy/projects/multica-upstream show 7a438bd5b8bf39afd54259a7eb0971390e50a8ef:<path> | sed -n '<line-3>,<line+3>p'`，核所述内容是否真在那里。行号对不上但文件里确有 = 建议级（写行号偏差）；文件里根本没有所述机制 = 该条应降「仅声明」= 建议级；路径不存在 = 验收④ 必然已红 = 必修。
2. 抽 **2 条**标「仅声明」的 F：报告里有没有写它搜了什么（`git grep` 关键词与取值）；没写 = 建议级。
3. 「最值得先抄的 3 条」的编号在正文里存在，理由落在 taskboard 约束上（20k 行单体、一人 + agent 维护、持续拉上游）而不是泛泛的「好」。
4. 「我没能确认的」是否真的是「没确认的」：抽 1 条，看它是否其实在正文里已被写成确认过的结论（自相矛盾 = 建议级）。

## 定级

必修：验收 ①–⑧ 任一条不达；抽核 0 任一计数不可复现或无命令；条款④ 命中（编路径 / 编取值，含抽核 1 的「路径不存在」）；「我没能确认的」写「无」或空；动了 multica-upstream 或 taskboard 其他文件；commit 数 ≠ 1。
建议级：条目质量、明显遗漏的参考点、行号偏差、篇幅、措辞。写进「局限」并给条目编号。

## 逃避与拧松清单（机械核，先于 Spec 轴跑；命中任一即必修级，唯一豁免 = 议题验收明文要求，VERDICT 里引原句）

对 `git diff $(git merge-base origin/main HEAD)..HEAD` 逐项取值写进 VERDICT，五项全 0 也要写「清单 5 项全 0」。
1. 测试 / fixture 文件改动行数（本议题应为 0）。
2. 新增 `|| true` / 空 `catch`（本议题应为 0）。
3. `--no-verify|--force` 出现在 diff 或 report 命令里。
4. `docs/briefs/**` `docs/agents/**` `docs/research/**`（除 `docs/research/D7/multica-reference-2.md`；`docs/research/D5/**` 改动也算命中）`AGENTS.md` `CLAUDE.md` `.teams-orca*.json` 改动 = 命中，本议题无豁免。
5. 验证被替代：报告 `## 取值` 里的命令与验收判据命令不一致却声称达标。

另核：恰 1 个 commit 且 pathspec 无越界 · 未 push · `git log --format=%b $(git merge-base origin/main HEAD)..HEAD | grep -ci co-authored` 取值原样贴（非 0 写进「局限」不计 finding）。

## 提交纪律

VERDICT 恰一个 commit：`git commit -m "docs(research): D7 R1-VERDICT (#7)" -- docs/research/D7/R1-VERDICT.md`；禁 `git add -A`；去 trailer 配方同实现单；🔴 禁 `git push`。

## 硬规则

1. 🔴 **只审不改**：不改交付物、不改任何别的文件。
2. 🔴 禁 `git push`。
3. 🔴 产物 = `docs/research/D7/R1-VERDICT.md`，头行 `PASS` / `FAIL`，按「Spec 轴 → 归店与脱敏 → 证据强度抽核 → 局限」四节写。
4. 🔴 结论写清是**逐条核过**还是**抽查未见**；找到的反例写进「局限」，不要藏。
5. 🔴 绝不改 multica-upstream；不 `terminal close` / `kill`；不跑 `orca orchestration reset` / `task-update` / `worker-*`（最后一次 `worker_done` 除外）；不动 `.teams/`。
6. 🔴 判退出码不用管道；判字面串 `grep -F`。

## worker 契约（原生编排）

report 落 `/Users/happy/projects/taskboard/.scratch/d7-native/reports/review.md`（`mkdir -p`），同目录 `touch .DONE`，然后**恰一次** `orca orchestration send --type worker_done --subject "PASS" --body "<三句>" --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded --files-modified "docs/research/D7/R1-VERDICT.md" --report-path /Users/happy/projects/taskboard/.scratch/d7-native/reports/review.md --json`。**`worker_done` 是最后一步，发完立即停手。**

## 关于本任务书自身

本文件不是审查对象，不要修改它。本节说明不得进入 VERDICT 正文。

## 完成后

report 头行 = **`PASS`（审查做完了，无论 verdict 是 PASS 还是 FAIL）**；只有审查本身没做成才写 `FAIL` / `BLOCKED`。verdict 只住 VERDICT 文件首行。正文：验收 8 条各一句判定 + 抽核 4 项结果 + 逃避清单 5 项取值 + 产物路径 + commit sha。
