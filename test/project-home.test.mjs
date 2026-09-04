import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const appSource = await readFile(new URL("../web/src/App.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../web/src/styles.css", import.meta.url), "utf8");
const editorSource = await readFile(new URL("../web/src/components/TaskEditor.tsx", import.meta.url), "utf8");
const detailSource = await readFile(new URL("../web/src/components/TaskDetail.tsx", import.meta.url), "utf8");
const labelPickerSource = await readFile(new URL("../web/src/components/LabelPicker.tsx", import.meta.url), "utf8");
const labelsSource = await readFile(new URL("../web/src/labels.ts", import.meta.url), "utf8");

test("project selection starts from the route or recent projects and updates the route", () => {
  assert.match(appSource, /const RECENT_PROJECT_IDS_KEY = "taskboard\.recentProjectIds\.v1"/);
  assert.match(appSource, /const initialProjectId = query\.get\("project"\) \?\? recentProjectIds\[0\] \?\? ALL_PROJECTS_ID/);
  assert.match(appSource, /const rememberProjectOpen = useCallback/);
  assert.match(appSource, /taskboardStorage\.setItem\(RECENT_PROJECT_IDS_KEY, JSON\.stringify\(next\)\)/);
  assert.match(appSource, /function changeProject\(projectId: string\)/);
  assert.match(appSource, /setSelectedProjectId\(projectId\)/);
  assert.match(appSource, /const url = buildIssueUrl\(window\.location\.href, projectId, null\)/);
  assert.match(appSource, /window\.history\.replaceState\(null, "", url\)/);
});

test("the selected project exposes the current board surfaces", () => {
  assert.match(appSource, /<header className="workspace-header">/);
  assert.match(appSource, /<div className="board-toolbar">/);
  assert.match(appSource, /<DashboardView/);
  assert.match(appSource, /<IssueListView/);
  assert.match(appSource, /<GanttView/);
  assert.match(appSource, /<BoardColumn/);
  assert.match(styles, /\.workspace-header \{[\s\S]*?border-bottom: var\(--border-hairline\) solid var\(--border\)/);
});

test("new issues insert attachments into the description and upload them after creation", () => {
  assert.match(editorSource, /type="file"[\s\S]*?multiple/);
  assert.match(editorSource, /<InlineMediaComposer[\s\S]*?allowAttachments/);
  assert.match(editorSource, /descriptionComposerRef\.current\?\.addFiles\(event\.currentTarget\.files\)/);
  assert.match(editorSource, /inlineMediaFiles\(descriptionSegments\)/);
  assert.match(appSource, /Promise\.allSettled/);
  assert.match(appSource, /uploadAttachment\(saved\.id, file\.file, "attachment"\)/);
  assert.match(appSource, /uploadAttachment\(saved\.id, image\.file, "inline"\)/);
  assert.match(appSource, /resolveInlineAttachmentMarkdown\([\s\S]*?resolveInlineMediaMarkdown\(/);
});

test("the issue composer includes Linear-style labels and scheduling", () => {
  for (const label of ["缺陷", "特性", "for-claude", "hold", "改进", "phase-1", "phase-6"]) {
    assert.match(labelsSource, new RegExp(label));
  }
  assert.match(editorSource, /<LabelPicker/);
  assert.match(labelPickerSource, /text\(`创建 “\$\{normalizedSearch\}”`, `Create “\$\{normalizedSearch\}”`\)/);
  assert.match(editorSource, /设置截止日期/);
  assert.match(editorSource, /设置重复/);
  assert.match(editorSource, /最早截止日期/);
  assert.match(editorSource, /developmentScan\.contexts/);
});

test("issue creation selects a project only from all projects and keeps the current project otherwise", () => {
  assert.match(editorSource, /\{!task && projectOptions && \([\s\S]*?ariaLabel=\{text\("项目", "Project"\)\}/);
  assert.doesNotMatch(detailSource, /detail-property-label">项目|project-property-icon|project\.name/);
  assert.match(appSource, /projectOptions=\{!editor\.task && isAllProjects \? createTargetProjects : undefined\}/);
  assert.match(appSource, /const targetProjectId = editorProjectId \?\? selectedProjectId;[\s\S]*?createTaskRequest\(targetProjectId, draft\)/);
  assert.match(appSource, /className="header-project-switcher"/);
});

test("the project header exposes project, automation, and create controls", () => {
  assert.match(appSource, /className="header-project-button"[\s\S]*?aria-haspopup="menu"/);
  assert.match(appSource, /className="header-project-menu" role="menu" aria-label=\{text\("项目", "Projects"\)\}/);
  assert.match(appSource, /className="icon-button header-create-button"/);
  assert.match(styles, /\.header-project-menu \{[\s\S]*?-webkit-app-region: no-drag/);
});

test("the project header keeps detail navigation separate from the project switcher", () => {
  assert.match(appSource, /const headerProjectName = isAllProjects\s*\? text\("所有项目", "All projects"\)\s*: selectedProject\?\.id === GLOBAL_PROJECT_ID\s*\? text\("临时任务", "Temporary tasks"\)\s*: selectedProject\?\.name \?\? text\("任务面板", "Taskboard"\)/);
  assert.match(appSource, /detailTask && \([\s\S]*?aria-label=\{text\("返回议题看板", "Back to issue board"\)\}[\s\S]*?<\/button>/);
  assert.match(appSource, /className="header-project-switcher"[\s\S]*?<span className="project-name">\{headerProjectName\}<\/span>/);
  assert.doesNotMatch(appSource, /className="issue-root-button"/);
  assert.doesNotMatch(appSource, /detailTask\?\.identifier \?\? "议题"/);
});

test("the app omits the old navigation and keeps the embedded draggable header region", () => {
  assert.doesNotMatch(appSource, /<aside className="app-nav"/);
  assert.match(appSource, /<header className="workspace-header">/);
  assert.match(appSource, /ref=\{dragRegionRef\} className="workspace-drag-region"/);
  assert.match(styles, /\.workspace-drag-region \{[\s\S]*?flex: 1;[\s\S]*?align-self: stretch/);
});

test("realtime updates remain active on the project home and reconcile after reconnecting", () => {
  assert.match(appSource, /useEffect\(\(\) => \{\s*const source = new EventSource\(resolveTaskboardUrl\("\/api\/events"\)\)/);
  assert.match(appSource, /event\.type\.startsWith\("task\."\)[\s\S]*?scheduleRefresh\(\{ projects: true, tasks: affectsSelectedProject \}\)/);
  assert.match(appSource, /source\.onopen = \(\) => \{[\s\S]*?scheduleRefresh\(\{ projects: true, tasks: Boolean\(selectedProjectId\) \}\)/);
});
