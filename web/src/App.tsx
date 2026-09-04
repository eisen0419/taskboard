import {
  Fragment,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ApiError,
  addTaskRelation,
  archiveTask as archiveTaskRequest,
  createProjectLabel as createProjectLabelRequest,
  createProject as createProjectRequest,
  createTask as createTaskRequest,
  deleteArchivedTask as deleteArchivedTaskRequest,
  deleteProjectLabel as deleteProjectLabelRequest,
  deleteProject as deleteProjectRequest,
  listArchivedTasks,
  listDevelopmentContexts,
  listProjects,
  listTasks,
  moveTask as moveTaskRequest,
  removeTaskRelation,
  resolveTaskboardUrl,
  restoreTask as restoreTaskRequest,
  setApiText,
  uploadAttachment,
  updateTask as updateTaskRequest,
} from "./api";
import {
  actorKey,
  actorForAssigneeTarget,
  assigneeTargetForActor,
} from "./actors";
import { BoardColumn } from "./components/BoardColumn";
import {
  BoardCardDisplayMenu,
  DEFAULT_BOARD_DISPLAY_SETTINGS,
  type BoardDisplaySettings,
} from "./components/BoardCardDisplayMenu";
import { DashboardView } from "./components/DashboardView";
import { ProjectReadmeView } from "./components/ProjectReadmeView";
import { IssueListView } from "./components/IssueListView";
import { ArchivedTasksColumn, OtherTasksPanel } from "./components/OtherTasksPanel";
import {
  resolveInlineAttachmentMarkdown,
  resolveInlineMediaMarkdown,
  type PendingInlineAttachment,
  type PendingInlineImage,
} from "./components/InlineMediaComposer";
import { LinearIcon } from "./components/LinearIcon";
import {
  DeleteIcon,
  MoreIcon,
  PlusIcon,
} from "./components/SemanticIcons";
import { TaskboardIcon } from "./components/TaskboardIcon";
import { TaskContextMenu } from "./components/TaskContextMenu";
import { TaskDetail } from "./components/TaskDetail";
import {
  TaskEditor,
  type NewTaskCreateOptions,
  type NewTaskEditorDraft,
} from "./components/TaskEditor";
import { TaskFilterMenu } from "./components/TaskFilterMenu";
import {
  PROJECT_BOARD_DISPLAY_SETTINGS_KEY_PREFIX,
  projectBoardDisplaySettingsStorageEntries,
  refreshProjectBoardDisplaySettingsStorage,
  taskboardStorage,
} from "./storage";
import { buildIssueUrl, readIssueIdentifier } from "./issueRoute";
import {
  getTaskboardI18n,
  resolveTaskboardLanguage,
  taskStatusLabel,
  TaskboardLanguageProvider,
} from "./i18n";
import {
  MAIN_STATUSES,
  type OtherTaskTab,
} from "./issueBoardStatuses";
import {
  taskCardPresentation,
  type TaskCardPresentation,
  type TaskConversationItem,
} from "./taskConversations";
import {
  EMPTY_TASK_FILTERS,
  matchesTaskFilters,
  matchesTaskSearch,
  readTaskFilters,
  taskFilterCount,
  writeTaskFilters,
} from "./taskFilters";
import {
  TASK_STATUSES,
  type ActorIdentity,
  type CodexThreadBinding,
  type DevelopmentScan,
  type IssueRelationOrigin,
  type IssueRelationType,
  type Project,
  type Task,
  type TaskDraft,
  type TaskStatus,
} from "./types";

type ConnectionState = "connecting" | "live" | "reconnecting";
type Theme = "light" | "dark";
type BoardView = "readme" | "dashboard" | "issues" | "list" | "gantt";
type DetailSourceScroll =
  | { projectId: string; view: "issues"; status: TaskStatus; scrollTop: number; scrollLeft: number }
  | { projectId: string; view: "list"; scrollTop: number };
type GanttZoom = "day" | "week" | "month";
type ActionError = string | readonly [string, string];
type ProjectLoadError = {
  source: "projects";
  operation: "initial" | "refresh";
  requestId: number;
  message: string;
};
type TasksLoadError = {
  source: "tasks";
  requestId: number;
  message: string;
};
type LoadError = ProjectLoadError | TasksLoadError;
const GANTT_ZOOM_OPTIONS: GanttZoom[] = ["day", "week", "month"];

const GanttView = lazy(() => import("./components/GanttView").then((module) => ({
  default: module.GanttView,
})));

interface EditorState {
  task: Task | null;
  status: TaskStatus;
  projectId?: string | null;
}

interface ContextMenuState {
  taskId: string;
  x: number;
  y: number;
}

interface ProjectChoice {
  id: string;
  name: string;
  issueCount: number;
}

interface ProjectContextMenuState {
  project: ProjectChoice;
  x: number;
  y: number;
}

interface UndoOperation {
  id: number;
  undo: () => Promise<void>;
}

interface UndoNotice {
  id: number;
  message: string;
}

const DEFAULT_USER_ACTOR: ActorIdentity = {
  type: "user",
  id: "local-user",
  name: "本地用户",
  avatarUrl: null,
};

const GLOBAL_PROJECT_ID = "local";
const ALL_PROJECTS_ID = "__all_projects__";
const ALL_PROJECTS_DEFAULT_BOARD_DISPLAY_SETTINGS: BoardDisplaySettings = {
  ...DEFAULT_BOARD_DISPLAY_SETTINGS,
  mainStatuses: ["backlog", ...DEFAULT_BOARD_DISPLAY_SETTINGS.mainStatuses],
  sidebarStatuses: DEFAULT_BOARD_DISPLAY_SETTINGS.sidebarStatuses.filter(
    (status) => status !== "backlog",
  ),
};
const RECENT_PROJECT_IDS_KEY = "taskboard.recentProjectIds.v1";
const PROJECT_VIEW_KEY_PREFIX = "taskboard.project-view.v1.";
const ISSUE_READ_KEY_PREFIX = "taskboard.issue-read.v1";
const FIRST_USE_COMPLETE_KEY = "taskboard.first-use-complete.v1";
function issueReadStorageKey(mode: string, task: Pick<Task, "id" | "projectId">) {
  return `${ISSUE_READ_KEY_PREFIX}:${mode}:${task.projectId}:${task.id}`;
}

function readProjectBoardView(projectId: string): BoardView {
  const view = taskboardStorage.getItem(`${PROJECT_VIEW_KEY_PREFIX}${projectId}`);
  return view === "readme" || view === "dashboard" || view === "list" || view === "gantt" || view === "issues"
    ? view
    : "issues";
}

function readProjectBoardDisplaySettings(): Record<string, BoardDisplaySettings> {
  const settings: Record<string, BoardDisplaySettings> = {};
  for (const [key, storedValue] of projectBoardDisplaySettingsStorageEntries()) {
    const projectId = key.slice(PROJECT_BOARD_DISPLAY_SETTINGS_KEY_PREFIX.length);
    if (!projectId) continue;
    try {
      const value = JSON.parse(storedValue);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        settings[projectId] = value as BoardDisplaySettings;
      }
    } catch {
      // Ignore malformed display settings without affecting other projects.
    }
  }
  return settings;
}

function readRecentProjectIds(): string[] {
  try {
    const value = JSON.parse(taskboardStorage.getItem(RECENT_PROJECT_IDS_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((projectId): projectId is string => typeof projectId === "string" && projectId.length > 0)
      : [];
  } catch {
    return [];
  }
}

const EVENT_NAMES = [
  "task.created",
  "task.updated",
  "task.moved",
  "task.archived",
  "task.restored",
  "task.deleted",
  "task.relation.updated",
  "comment.created",
  "comment.updated",
  "comment.deleted",
  "attachment.created",
  "attachment.deleted",
  "project.created",
  "project.labels.updated",
  "project.readme.updated",
  "client-storage.updated",
] as const;

function getInitialTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt),
  );
}

function taskToDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    labels: task.labels,
    developmentContext: task.developmentContext,
    startDate: task.startDate,
    dueDate: task.dueDate,
    recurrence: task.recurrence,
  };
}

interface LocalRealtimeSyncProps {
  selectedProjectId: string;
  detailTaskId: string | null;
  refreshProjectList: () => Promise<void>;
  refreshTasks: (
    projectId: string,
    options?: { quiet?: boolean; signal?: AbortSignal },
  ) => Promise<void>;
  refreshProjectBoardDisplaySettings: () => Promise<void>;
  setConnection: Dispatch<SetStateAction<ConnectionState>>;
  setCommentsRevision: Dispatch<SetStateAction<number>>;
  setAttachmentsRevision: Dispatch<SetStateAction<number>>;
  setReadmeRevision: Dispatch<SetStateAction<number>>;
}

function LocalRealtimeSync({
  selectedProjectId,
  detailTaskId,
  refreshProjectList,
  refreshTasks,
  refreshProjectBoardDisplaySettings,
  setConnection,
  setCommentsRevision,
  setAttachmentsRevision,
  setReadmeRevision,
}: LocalRealtimeSyncProps) {
  useEffect(() => {
    const source = new EventSource(resolveTaskboardUrl("/api/events"));
    let refreshTimer: number | undefined;
    let refreshProjectsPending = false;
    let refreshTasksPending = false;

    const scheduleRefresh = (options: { projects?: boolean; tasks?: boolean }) => {
      refreshProjectsPending ||= options.projects === true;
      refreshTasksPending ||= options.tasks === true;
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        if (refreshProjectsPending) void refreshProjectList();
        if (refreshTasksPending && selectedProjectId) {
          void refreshTasks(selectedProjectId, { quiet: true });
        }
        refreshProjectsPending = false;
        refreshTasksPending = false;
      }, 120);
    };

    const handleEvent = (event: Event) => {
      const message = event as MessageEvent<string>;
      let payload: { projectId?: string; taskId?: string; project?: Project; key?: string } = {};
      try {
        payload = JSON.parse(message.data) as {
          projectId?: string;
          taskId?: string;
          project?: Project;
          key?: string;
        };
      } catch {
        // A malformed event should not interrupt later updates.
      }
      if (
        event.type === "client-storage.updated"
        && payload.key?.startsWith(PROJECT_BOARD_DISPLAY_SETTINGS_KEY_PREFIX)
      ) {
        void refreshProjectBoardDisplaySettings();
        return;
      }
      const eventProjectId = payload.projectId ?? payload.project?.id;
      const affectsSelectedProject = Boolean(selectedProjectId)
        && (
          selectedProjectId === ALL_PROJECTS_ID
          || !eventProjectId
          || eventProjectId === selectedProjectId
        );
      if (event.type === "project.created") {
        scheduleRefresh({ projects: true });
        return;
      }
      if (event.type === "project.labels.updated") {
        scheduleRefresh({ projects: true, tasks: affectsSelectedProject });
        return;
      }
      if (event.type.startsWith("task.")) {
        scheduleRefresh({ projects: true, tasks: affectsSelectedProject });
        return;
      }
      if (!affectsSelectedProject) return;
      if (event.type === "project.readme.updated") {
        setReadmeRevision((current) => current + 1);
        return;
      }
      if (event.type.startsWith("comment.")) {
        if (!detailTaskId || !payload.taskId || payload.taskId === detailTaskId) {
          setCommentsRevision((current) => current + 1);
        }
        scheduleRefresh({ tasks: true });
        return;
      }
      if (event.type.startsWith("attachment.")) {
        if (!detailTaskId || !payload.taskId || payload.taskId === detailTaskId) {
          setAttachmentsRevision((current) => current + 1);
          setCommentsRevision((current) => current + 1);
        }
      }
    };

    EVENT_NAMES.forEach((name) => source.addEventListener(name, handleEvent));
    source.onopen = () => {
      setConnection("live");
      void refreshProjectBoardDisplaySettings();
      scheduleRefresh({ projects: true, tasks: Boolean(selectedProjectId) });
      if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
        setReadmeRevision((current) => current + 1);
      }
      if (detailTaskId) {
        setCommentsRevision((current) => current + 1);
        setAttachmentsRevision((current) => current + 1);
      }
    };
    source.onerror = () => setConnection("reconnecting");

    return () => {
      window.clearTimeout(refreshTimer);
      EVENT_NAMES.forEach((name) => source.removeEventListener(name, handleEvent));
      source.close();
    };
  }, [
    detailTaskId,
    refreshProjectBoardDisplaySettings,
    refreshProjectList,
    refreshTasks,
    selectedProjectId,
    setAttachmentsRevision,
    setCommentsRevision,
    setConnection,
    setReadmeRevision,
  ]);

  return null;
}

export function App() {
  const query = useMemo(() => new URL(document.baseURI).searchParams, []);
  const undoShortcut = navigator.userAgent.includes("Macintosh") ? "⌘Z" : "Ctrl+Z";
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const language = resolveTaskboardLanguage(query.get("lang") ?? navigator.language);
  const { locale, text } = getTaskboardI18n(language);
  const [developmentScan, setDevelopmentScan] = useState<DevelopmentScan>({ workspacePath: null, contexts: [] });
  const [developmentScanLoading, setDevelopmentScanLoading] = useState(false);
  const [readActivityKeys, setReadActivityKeys] = useState<Record<string, string>>({});
  const [processingNow, setProcessingNow] = useState(() => Date.now());
  const [recentProjectIds, setRecentProjectIds] = useState(readRecentProjectIds);
  const initialProjectId = query.get("project") ?? recentProjectIds[0] ?? ALL_PROJECTS_ID;
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [hasLoadedTasks, setHasLoadedTasks] = useState(false);
  const [projectLoadError, setProjectLoadError] = useState<ProjectLoadError | null>(null);
  const [tasksLoadError, setTasksLoadError] = useState<TasksLoadError | null>(null);
  const loadError: LoadError | null = projectLoadError ?? tasksLoadError;
  const [actionError, setActionError] = useState<ActionError | null>(null);
  const actionErrorText = actionError === null
    ? null
    : typeof actionError === "string"
      ? actionError
      : text(actionError[0], actionError[1]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(readTaskFilters);
  const [boardView, setBoardView] = useState<BoardView>(() => readProjectBoardView(initialProjectId));
  const [projectBoardDisplaySettings, setProjectBoardDisplaySettings] = useState(
    readProjectBoardDisplaySettings,
  );
  const refreshProjectBoardDisplaySettings = useCallback(async () => {
    try {
      await refreshProjectBoardDisplaySettingsStorage();
      setProjectBoardDisplaySettings(readProjectBoardDisplaySettings());
    } catch (error) {
      console.error(error);
    }
  }, []);
  const [ganttZoom, setGanttZoom] = useState<GanttZoom>("week");
  const [ganttHideCompleted, setGanttHideCompleted] = useState(false);
  const [ganttTodayRequest, setGanttTodayRequest] = useState(0);
  const [ganttViewMenuOpen, setGanttViewMenuOpen] = useState(false);
  const [otherTasksOpen, setOtherTasksOpen] = useState(false);
  const [otherTasksMounted, setOtherTasksMounted] = useState(false);
  const [otherTasksVisible, setOtherTasksVisible] = useState(false);
  const [otherTasksTab, setOtherTasksTab] = useState<OtherTaskTab>("backlog");
  const [restoringTaskId, setRestoringTaskId] = useState<string | null>(null);
  const [pendingArchivedTaskDelete, setPendingArchivedTaskDelete] = useState<Task | null>(null);
  const [deletingArchivedTaskId, setDeletingArchivedTaskId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [newTaskDraft, setNewTaskDraft] = useState<{
    projectId: string;
    targetProjectId: string | null;
    draft: NewTaskEditorDraft;
  } | null>(null);
  const [detailTaskIdentifier, setDetailTaskIdentifier] = useState<string | null>(
    () => readIssueIdentifier(window.location.search),
  );
  const [commentsRevision, setCommentsRevision] = useState(0);
  const [attachmentsRevision, setAttachmentsRevision] = useState(0);
  const [readmeRevision, setReadmeRevision] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedTaskHeight, setDraggedTaskHeight] = useState(0);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [settlingTaskId, setSettlingTaskId] = useState<string | null>(null);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(
    () => taskboardStorage.getItem(FIRST_USE_COMPLETE_KEY) === null,
  );
  const [projectMenuSearch, setProjectMenuSearch] = useState("");
  const [projectContextMenu, setProjectContextMenu] = useState<ProjectContextMenuState | null>(null);
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [pendingProjectDelete, setPendingProjectDelete] = useState<ProjectChoice | null>(null);
  const [projectDeleteIssueCount, setProjectDeleteIssueCount] = useState<number | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [announcement, setAnnouncementValue] = useState("");
  const [undoNotice, setUndoNotice] = useState<UndoNotice | null>(null);
  const projectsRequestRef = useRef(0);
  const tasksRequestRef = useRef(0);
  const tasksRef = useRef<Task[]>([]);
  const undoSequenceRef = useRef(0);
  const undoStackRef = useRef<UndoOperation[]>([]);
  const undoInFlightRef = useRef(false);
  const dragRegionRef = useRef<HTMLDivElement>(null);
  const issueListRef = useRef<HTMLDivElement>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const boardColumnScrollRefs = useRef<Partial<Record<TaskStatus, HTMLDivElement | null>>>({});
  const detailSourceProjectIdRef = useRef<string | null>(null);
  const pendingDetailSourceScrollRef = useRef<DetailSourceScroll | null>(null);
  const taskScopeProjectId = detailSourceProjectIdRef.current ?? selectedProjectId;
  const taskScopeProjectIdRef = useRef(taskScopeProjectId);
  taskScopeProjectIdRef.current = taskScopeProjectId;

  const textRef = useRef(text);
  textRef.current = text;
  setApiText(text);
  function errorMessage(error: unknown): string {
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error) return error.message;
    return textRef.current(
      "加载议题时出现问题。",
      "Something went wrong while loading your issues.",
    );
  }

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setAnnouncement = useCallback((message: string) => {
    setUndoNotice(null);
    setAnnouncementValue(message);
  }, []);

  const rememberProjectOpen = useCallback((projectId: string) => {
    setRecentProjectIds((current) => {
      if (current[0] === projectId) return current;
      const next = [projectId, ...current.filter((candidate) => candidate !== projectId)];
      taskboardStorage.setItem(RECENT_PROJECT_IDS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const isAllProjects = selectedProjectId === ALL_PROJECTS_ID;
  const storedBoardDisplaySettings = projectBoardDisplaySettings[selectedProjectId]
    ?? (isAllProjects
      ? ALL_PROJECTS_DEFAULT_BOARD_DISPLAY_SETTINGS
      : DEFAULT_BOARD_DISPLAY_SETTINGS);
  const boardDisplaySettings: BoardDisplaySettings = isAllProjects
    && storedBoardDisplaySettings.sidebarStatuses.includes("backlog")
    && !storedBoardDisplaySettings.mainStatuses.includes("backlog")
    ? {
        ...storedBoardDisplaySettings,
        mainStatuses: ["backlog", ...storedBoardDisplaySettings.mainStatuses],
        sidebarStatuses: storedBoardDisplaySettings.sidebarStatuses.filter(
          (status) => status !== "backlog",
        ),
      }
    : storedBoardDisplaySettings;
  useLayoutEffect(() => {
    if (selectedProject) rememberProjectOpen(selectedProject.id);
  }, [rememberProjectOpen, selectedProject]);
  const currentUser = {
    ...DEFAULT_USER_ACTOR,
    name: text("本地用户", "Local user"),
  };
  const referenceTasks = useMemo(() => [...tasks, ...archivedTasks], [archivedTasks, tasks]);
  const detailTask = detailTaskIdentifier
    ? referenceTasks.find((task) => task.identifier === detailTaskIdentifier) ?? null
    : null;
  const detailTaskId = detailTask?.id ?? null;
  const contextMenuTask = contextMenu
    ? tasks.find((task) => task.id === contextMenu.taskId) ?? null
    : null;
  const availableLabels = isAllProjects
    ? [...new Set(projects.flatMap((project) => project.labels))]
    : selectedProject?.labels ?? [];
  const projectNames = useMemo(() => Object.fromEntries(projects.map((project) => [
    project.id,
    project.id === GLOBAL_PROJECT_ID ? text("临时任务", "Temporary tasks") : project.name,
  ])), [projects, text]);
  const projectChoices = useMemo<ProjectChoice[]>(() => {
    const recentOrder = new Map(recentProjectIds.map((projectId, index) => [projectId, index]));
    const choices = projects.map((project) => ({
      id: project.id,
      name: project.id === GLOBAL_PROJECT_ID
        ? text("临时任务", "Temporary tasks")
        : project.name,
      issueCount: project.issueCount,
    })).sort((left, right) => (
      (recentOrder.get(left.id) ?? recentProjectIds.length)
      - (recentOrder.get(right.id) ?? recentProjectIds.length)
    ));
    return [
      ...choices.filter((project) => project.issueCount > 0),
      ...choices.filter((project) => project.issueCount === 0),
    ];
  }, [projects, recentProjectIds, text]);
  const projectMenuCandidates = projectChoices.filter(
    (project) => project.id !== GLOBAL_PROJECT_ID || project.issueCount > 0,
  );
  const projectMenuNeedle = projectMenuSearch.trim().toLocaleLowerCase();
  const projectMenuChoices = projectMenuNeedle
    ? projectMenuCandidates.filter((project) => project.name.toLocaleLowerCase().includes(projectMenuNeedle))
    : projectMenuCandidates;
  const firstEmptyProjectId = projectMenuChoices.find((project) => project.issueCount === 0)?.id ?? null;
  const hasProjectsWithIssues = projectMenuChoices.some((project) => project.issueCount > 0);
  const editorProjectId = editor?.task?.projectId
    ?? editor?.projectId
    ?? (newTaskDraft?.projectId === selectedProjectId ? newTaskDraft.targetProjectId : undefined)
    ?? (isAllProjects ? GLOBAL_PROJECT_ID : selectedProjectId);
  const developmentEditorProjectId = isAllProjects && editor ? editorProjectId : null;
  const createTargetProjects = projectChoices.map(({ id, name }) => ({ id, name }));
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  function openTaskContextMenu(task: Task, position: { x: number; y: number }) {
    if (isAllProjects && task.developmentContext?.type === "worktree") {
      setDevelopmentScanLoading(true);
    }
    setContextMenu({ taskId: task.id, ...position });
  }
  const issueReadMode = "local";

  useEffect(() => {
    let mountFrame = 0;
    let showFrame = 0;
    let closeTimer = 0;

    if (otherTasksOpen) {
      setOtherTasksMounted(true);
      mountFrame = window.requestAnimationFrame(() => {
        showFrame = window.requestAnimationFrame(() => setOtherTasksVisible(true));
      });
    } else {
      setOtherTasksVisible(false);
      closeTimer = window.setTimeout(() => setOtherTasksMounted(false), 320);
    }

    return () => {
      window.cancelAnimationFrame(mountFrame);
      window.cancelAnimationFrame(showFrame);
      window.clearTimeout(closeTimer);
    };
  }, [otherTasksOpen]);

  const markTaskRead = useCallback((task: Task) => {
    if (!task.activityKey) return;
    const storageKey = issueReadStorageKey(issueReadMode, task);
    setReadActivityKeys((current) => {
      if (current[storageKey] === task.activityKey) return current;
      const next = { ...current, [storageKey]: task.activityKey };
      try {
        taskboardStorage.setItem(storageKey, task.activityKey);
      } catch {
        // Read state remains valid for this page even when browser persistence is unavailable.
      }
      return next;
    });
  }, [issueReadMode]);

  useEffect(() => {
    if (detailTask) markTaskRead(detailTask);
  }, [detailTask?.activityKey, detailTask?.id, markTaskRead]);

  function openTaskDetail(task: Pick<Task, "identifier" | "projectId">) {
    const fullTask = tasksRef.current.find((candidate) => candidate.identifier === task.identifier);
    if (fullTask) markTaskRead(fullTask);
    const currentIssue = readIssueIdentifier(window.location.search);
    if (!currentIssue) detailSourceProjectIdRef.current = selectedProjectId;
    if (isAllProjects) setSelectedProjectId(task.projectId);
    if (boardView === "list" && issueListRef.current) {
      pendingDetailSourceScrollRef.current = {
        projectId: selectedProjectId,
        view: "list",
        scrollTop: issueListRef.current.scrollTop,
      };
    } else if (boardView === "issues" && fullTask) {
      const scrollContainer = boardColumnScrollRefs.current[fullTask.status];
      if (scrollContainer) {
        pendingDetailSourceScrollRef.current = {
          projectId: selectedProjectId,
          view: "issues",
          status: fullTask.status,
          scrollTop: scrollContainer.scrollTop,
          scrollLeft: boardScrollRef.current?.scrollLeft ?? 0,
        };
      }
    }
    closeContextMenu();
    setProjectMenuOpen(false);
    setDetailTaskIdentifier(task.identifier);
    const boardUrl = buildIssueUrl(window.location.href, selectedProjectId, null);
    if (!currentIssue) {
      window.history.replaceState(window.history.state, "", boardUrl);
    }
    const detailUrl = buildIssueUrl(
      currentIssue ? window.location.href : boardUrl.href,
      task.projectId,
      task.identifier,
    );
    window.history.pushState(window.history.state, "", detailUrl);
  }

  function closeTaskDetail() {
    const sourceProjectId = detailSourceProjectIdRef.current ?? selectedProjectId;
    detailSourceProjectIdRef.current = null;
    setDetailTaskIdentifier(null);
    if (sourceProjectId !== selectedProjectId) {
      setSelectedProjectId(sourceProjectId);
      setBoardView(sourceProjectId === ALL_PROJECTS_ID ? "issues" : readProjectBoardView(sourceProjectId));
    }
    const url = buildIssueUrl(window.location.href, sourceProjectId, null);
    window.history.replaceState(window.history.state, "", url);
  }

  useLayoutEffect(() => {
    if (detailTaskIdentifier) return;
    const pendingScroll = pendingDetailSourceScrollRef.current;
    if (!pendingScroll) return;
    if (pendingScroll.view !== boardView || pendingScroll.projectId !== selectedProjectId) {
      pendingDetailSourceScrollRef.current = null;
      return;
    }
    pendingDetailSourceScrollRef.current = null;
    if (pendingScroll.view === "list") {
      if (issueListRef.current) issueListRef.current.scrollTop = pendingScroll.scrollTop;
      return;
    }
    const columnScrollContainer = boardColumnScrollRefs.current[pendingScroll.status];
    if (columnScrollContainer) columnScrollContainer.scrollTop = pendingScroll.scrollTop;
    if (boardScrollRef.current) boardScrollRef.current.scrollLeft = pendingScroll.scrollLeft;
  }, [boardView, detailTaskIdentifier, selectedProjectId]);

  useEffect(() => {
    function syncRouteFromLocation() {
      const url = new URL(window.location.href);
      const routeProjectId = url.searchParams.get("project") ?? GLOBAL_PROJECT_ID;
      const routeIssueIdentifier = readIssueIdentifier(url.search);
      if (routeIssueIdentifier && boardView === "list" && issueListRef.current) {
        pendingDetailSourceScrollRef.current = {
          projectId: selectedProjectId,
          view: "list",
          scrollTop: issueListRef.current.scrollTop,
        };
      } else if (routeIssueIdentifier && boardView === "issues") {
        const routeTask = tasksRef.current.find(
          (task) => task.identifier === routeIssueIdentifier,
        );
        const scrollContainer = routeTask
          ? boardColumnScrollRefs.current[routeTask.status]
          : null;
        if (routeTask && scrollContainer) {
          pendingDetailSourceScrollRef.current = {
            projectId: selectedProjectId,
            view: "issues",
            status: routeTask.status,
            scrollTop: scrollContainer.scrollTop,
            scrollLeft: boardScrollRef.current?.scrollLeft ?? 0,
          };
        }
      }
      if (!routeIssueIdentifier) detailSourceProjectIdRef.current = null;
      setDetailTaskIdentifier(routeIssueIdentifier);
      if (routeProjectId === selectedProjectId) return;
      setBoardView(routeProjectId === ALL_PROJECTS_ID ? "issues" : readProjectBoardView(routeProjectId));
      setSelectedProjectId(routeProjectId);
    }

    window.addEventListener("popstate", syncRouteFromLocation);
    return () => window.removeEventListener("popstate", syncRouteFromLocation);
  }, [boardView, selectedProjectId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.embedded = "false";
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => setTheme(systemTheme.matches ? "dark" : "light");
    syncTheme();
    systemTheme.addEventListener("change", syncTheme);
    return () => systemTheme.removeEventListener("change", syncTheme);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setBoardView(selectedProjectId === ALL_PROJECTS_ID ? "issues" : readProjectBoardView(selectedProjectId));
    }
  }, [selectedProjectId]);

  useEffect(() => {
    writeTaskFilters(filters);
  }, [filters]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    if (taskboardStorage.getItem(FIRST_USE_COMPLETE_KEY) === null) {
      taskboardStorage.setItem(FIRST_USE_COMPLETE_KEY, "true");
    }
  }, []);

  useEffect(() => {
    if (!projectMenuOpen) return;
    function closeProjectMenu(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-project-switcher]")) setProjectMenuOpen(false);
    }
    function closeProjectMenuWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProjectMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeProjectMenu);
    window.addEventListener("keydown", closeProjectMenuWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeProjectMenu);
      window.removeEventListener("keydown", closeProjectMenuWithEscape);
    };
  }, [projectMenuOpen]);

  useEffect(() => {
    if (!projectContextMenu) return;
    function closeProjectContextMenu(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-project-context-menu]")) setProjectContextMenu(null);
    }
    function closeProjectContextMenuWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProjectContextMenu(null);
    }
    document.addEventListener("pointerdown", closeProjectContextMenu);
    window.addEventListener("keydown", closeProjectContextMenuWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeProjectContextMenu);
      window.removeEventListener("keydown", closeProjectContextMenuWithEscape);
    };
  }, [projectContextMenu]);

  const loadProjectList = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++projectsRequestRef.current;
    setProjectLoadError((current) => (
      current?.operation === "initial" ? { ...current, requestId } : current
    ));
    try {
      const [nextProjects, nextTemporaryTasks] = await Promise.all([
        listProjects(signal),
        listTasks(GLOBAL_PROJECT_ID, signal),
      ]);
      if (requestId !== projectsRequestRef.current) return;
      setProjects(nextProjects.map((project) => project.id === GLOBAL_PROJECT_ID
        ? {
            ...project,
            issueCount: nextTemporaryTasks.filter((task) => (
              MAIN_STATUSES.some((status) => status === task.status)
            )).length,
          }
        : project));
      setSelectedProjectId((current) => {
        const fromQuery = new URLSearchParams(window.location.search).get("project");
        if (fromQuery === ALL_PROJECTS_ID) return fromQuery;
        if (fromQuery && nextProjects.some((project) => project.id === fromQuery)) return fromQuery;
        if (current === ALL_PROJECTS_ID) return current;
        if (current && nextProjects.some((project) => project.id === current)) return current;
        return nextProjects.find((project) => project.id === GLOBAL_PROJECT_ID)?.id
          ?? nextProjects[0]?.id
          ?? GLOBAL_PROJECT_ID;
      });
      setProjectLoadError((current) => (
        current?.operation === "initial" && current.requestId === requestId ? null : current
      ));
    } catch (error) {
      if ((error as Error).name !== "AbortError" && requestId === projectsRequestRef.current) {
        setProjectLoadError({
          source: "projects",
          operation: "initial",
          requestId,
          message: errorMessage(error),
        });
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadProjectList(controller.signal);
    return () => controller.abort();
  }, [loadProjectList]);

  const refreshProjectList = useCallback(async () => {
    const requestId = ++projectsRequestRef.current;
    setProjectLoadError((current) => (
      current?.operation === "refresh" ? { ...current, requestId } : current
    ));
    try {
      const [nextProjects, nextTemporaryTasks] = await Promise.all([
        listProjects(),
        listTasks(GLOBAL_PROJECT_ID),
      ]);
      if (requestId !== projectsRequestRef.current) return;
      setProjects(nextProjects.map((project) => project.id === GLOBAL_PROJECT_ID
        ? {
            ...project,
            issueCount: nextTemporaryTasks.filter((task) => (
              MAIN_STATUSES.some((status) => status === task.status)
            )).length,
          }
        : project));
      setProjectLoadError((current) => (
        current?.operation === "refresh" && current.requestId === requestId ? null : current
      ));
    } catch (error) {
      if (requestId === projectsRequestRef.current) {
        setProjectLoadError({
          source: "projects",
          operation: "refresh",
          requestId,
          message: errorMessage(error),
        });
      }
    }
  }, []);

  const refreshTasks = useCallback(async (
    projectId: string,
    options: { quiet?: boolean; signal?: AbortSignal } = {},
  ) => {
    const requestId = ++tasksRequestRef.current;
    if (!options.quiet) setTasksLoading(true);
    setTasksLoadError((current) => (
      current ? { ...current, requestId } : current
    ));
    try {
      const taskProjectId = projectId === ALL_PROJECTS_ID ? undefined : projectId;
      const [nextTasks, nextArchivedTasks] = await Promise.all([
        listTasks(taskProjectId, options.signal),
        listArchivedTasks(taskProjectId, options.signal),
      ]);
      if (requestId !== tasksRequestRef.current) return;
      setTasks(sortTasks(nextTasks));
      setArchivedTasks(sortTasks(nextArchivedTasks));
      setHasLoadedTasks(true);
      setTasksLoadError((current) => (
        current?.requestId === requestId ? null : current
      ));
    } catch (error) {
      if ((error as Error).name !== "AbortError" && requestId === tasksRequestRef.current) {
        setTasksLoadError({ source: "tasks", requestId, message: errorMessage(error) });
      }
    } finally {
      if (!options.quiet && requestId === tasksRequestRef.current) setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!taskScopeProjectId) {
      setTasks([]);
      setArchivedTasks([]);
      setHasLoadedTasks(false);
      return;
    }
    setHasLoadedTasks(false);
    const controller = new AbortController();
    void refreshTasks(taskScopeProjectId, { signal: controller.signal });
    return () => controller.abort();
  }, [refreshTasks, taskScopeProjectId]);

  useEffect(() => {
    const developmentProjectId = isAllProjects
      ? developmentEditorProjectId ?? contextMenuTask?.projectId
      : selectedProjectId;
    if (!developmentProjectId) {
      setDevelopmentScan({ workspacePath: null, contexts: [] });
      setDevelopmentScanLoading(false);
      return;
    }
    const controller = new AbortController();
    const workspacePath = projects.find((project) => project.id === developmentProjectId)
      ?.workspacePath ?? undefined;
    setDevelopmentScan({ workspacePath: workspacePath ?? null, contexts: [] });
    setDevelopmentScanLoading(true);
    void listDevelopmentContexts(
      developmentProjectId,
      developmentProjectId,
      isAllProjects ? contextMenuTask?.threadId ?? undefined : detailTask?.threadId ?? undefined,
      controller.signal,
      workspacePath,
    )
      .then(setDevelopmentScan)
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setDevelopmentScan({ workspacePath: workspacePath ?? null, contexts: [] });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDevelopmentScanLoading(false);
      });
    return () => controller.abort();
  }, [
    contextMenuTask?.projectId,
    contextMenuTask?.threadId,
    detailTask?.threadId,
    developmentEditorProjectId,
    isAllProjects,
    projects,
    selectedProjectId,
  ]);

  function pushUndo(message: string | null, undo: () => Promise<void>) {
    const operation = { id: ++undoSequenceRef.current, undo };
    undoStackRef.current = [...undoStackRef.current.slice(-19), operation];
    if (!message) return;
    setAnnouncementValue("");
    setUndoNotice({ id: operation.id, message });
  }

  async function performUndo() {
    if (undoInFlightRef.current) return;
    const operation = undoStackRef.current.at(-1);
    if (!operation) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    undoInFlightRef.current = true;
    setUndoNotice(null);
    setProjectMenuOpen(false);
    closeContextMenu();
    setActionError(null);
    try {
      await operation.undo();
    } catch (error) {
      setActionError(text(
        `无法撤回这次操作：${errorMessage(error)}`,
        `Could not undo this action: ${errorMessage(error)}`,
      ));
      if (taskScopeProjectId) void refreshTasks(taskScopeProjectId, { quiet: true });
    } finally {
      undoInFlightRef.current = false;
    }
  }

  async function restoreTaskDetails(
    snapshot: Task,
    changed: Task,
    assigneeTarget = assigneeTargetForActor(snapshot.assignee, currentUser),
  ) {
    const candidate = tasksRef.current.find((task) => task.id === changed.id);
    const current = candidate && candidate.version >= changed.version ? candidate : changed;
    const restored = await updateTaskRequest(current, {
      ...taskToDraft(snapshot),
      ...(assigneeTarget ? { assigneeTarget } : {}),
    });
    setTasks((tasks) => sortTasks(tasks.map((task) => task.id === restored.id ? restored : task)));
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, select, [contenteditable='true']");
      if (
        event.key.toLowerCase() === "z"
        && (event.metaKey || event.ctrlKey)
        && !event.shiftKey
        && !isTyping
        && !editor
      ) {
        event.preventDefault();
        void performUndo();
        return;
      }
      if (isTyping || contextMenu || projectMenuOpen) return;
      if (
        event.key.toLowerCase() === "c"
        && !event.metaKey
        && !event.ctrlKey
        && selectedProjectId
      ) {
        event.preventDefault();
        setEditor({ task: null, status: "todo" });
      }
      if (
        event.key === "/"
        && !detailTaskId
        && selectedProjectId
        && (boardView === "issues" || boardView === "list" || boardView === "gantt")
      ) {
        event.preventDefault();
        document.getElementById("task-search")?.focus();
      }
      if (event.key === "Escape" && detailTaskId) {
        closeTaskDetail();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [boardView, contextMenu, detailTaskId, editor, projectMenuOpen, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(
      (task) => matchesTaskSearch(task, search, language) && matchesTaskFilters(task, filters),
    );
  }, [filters, language, search, tasks]);

  const filteredArchivedTasks = useMemo(() => archivedTasks.filter(
    (task) => matchesTaskSearch(task, search, language) && matchesTaskFilters(task, filters),
  ), [archivedTasks, filters, language, search]);

  const activeFilterCount = taskFilterCount(filters);
  const hasActiveTaskFilters = Boolean(search.trim()) || activeFilterCount > 0;

  const tasksByStatus = useMemo(() => {
    return Object.fromEntries(
      TASK_STATUSES.map((status) => [status, filteredTasks.filter((task) => task.status === status)]),
    ) as Record<TaskStatus, Task[]>;
  }, [filteredTasks]);

  const mainBoardItems = boardDisplaySettings.mainStatuses.filter(
    (status) => status !== "blocked"
      || !hasLoadedTasks
      || tasks.some((task) => task.status === "blocked"),
  );
  const mainColumnCount = Math.max(mainBoardItems.length, 1);
  const mainBoardMinWidth = (mainColumnCount * 300) + ((mainColumnCount - 1) * 24);
  const mainBoardMaxWidth = (mainColumnCount * 400) + ((mainColumnCount - 1) * 24);
  const otherTasksColumnCount = mainColumnCount + 1;
  const otherTasksWidth = `clamp(300px, calc(${100 / otherTasksColumnCount}% - ${(36 + (mainColumnCount * 24)) / otherTasksColumnCount}px), 400px)`;
  const otherTaskTabs = boardDisplaySettings.sidebarStatuses;
  const otherTaskTabsKey = otherTaskTabs.join(",");
  const otherTasksAvailable = otherTaskTabs.length > 0;

  useEffect(() => {
    if (!otherTasksAvailable) {
      setOtherTasksOpen(false);
      return;
    }
    if (otherTaskTabs.includes(otherTasksTab)) return;
    setOtherTasksTab(otherTaskTabs[0]);
  }, [otherTaskTabsKey, otherTasksAvailable, otherTasksTab]);

  const taskPresentations = useMemo(() => Object.fromEntries(tasks.map((task) => {
    const storageKey = issueReadStorageKey(issueReadMode, task);
    const readActivityKey = readActivityKeys[storageKey] ?? taskboardStorage.getItem(storageKey);
    const unread = (task.status === "in_review" || task.status === "blocked")
      && readActivityKey !== task.activityKey;
    return [task.id, taskCardPresentation(task, unread)];
  })) as Record<string, TaskCardPresentation>, [issueReadMode, readActivityKeys, tasks]);
  const hasRunningTask = useMemo(
    () => Object.values(taskPresentations).some((presentation) => presentation.processing.running),
    [taskPresentations],
  );

  useEffect(() => {
    setProcessingNow(Date.now());
    if (!hasRunningTask) return;
    const timer = window.setInterval(() => setProcessingNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [hasRunningTask]);


  function selectBoardView(view: BoardView) {
    closeContextMenu();
    setGanttViewMenuOpen(false);
    setBoardView(view);
    if (selectedProjectId) {
      taskboardStorage.setItem(`${PROJECT_VIEW_KEY_PREFIX}${selectedProjectId}`, view);
    }
  }

  function updateProjectBoardDisplaySettings(value: BoardDisplaySettings) {
    setProjectBoardDisplaySettings((current) => {
      const next = { ...current, [selectedProjectId]: value };
      taskboardStorage.setItem(
        `${PROJECT_BOARD_DISPLAY_SETTINGS_KEY_PREFIX}${selectedProjectId}`,
        JSON.stringify(value),
      );
      return next;
    });
  }

  function resetProjectBoardDisplaySettings() {
    setProjectBoardDisplaySettings((current) => {
      const next = { ...current };
      delete next[selectedProjectId];
      taskboardStorage.removeItem(
        `${PROJECT_BOARD_DISPLAY_SETTINGS_KEY_PREFIX}${selectedProjectId}`,
      );
      return next;
    });
  }

  async function saveEditor(
    draft: TaskDraft,
    inlineFiles: PendingInlineAttachment[],
    inlineImages: PendingInlineImage[],
    createOptions?: NewTaskCreateOptions,
  ) {
    if (!selectedProjectId || !editor) return;
    const targetProjectId = editorProjectId ?? selectedProjectId;
    setActionError(null);
    const creating = editor.task === null;
    let saved: Task;
    try {
      saved = editor.task
        ? await updateTaskRequest(editor.task, draft)
        : await createTaskRequest(targetProjectId, draft);
    } catch (error) {
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
        void refreshTasks(taskScopeProjectId, { quiet: true });
      }
      throw error;
    }
    if (creating) {
      setProjects((current) => current.map((project) => (
        project.id === targetProjectId
          ? { ...project, issueCount: project.issueCount + 1 }
          : project
      )));
    }
    let postCreateWriteFailed = false;
    if (creating && (inlineFiles.length > 0 || inlineImages.length > 0)) {
      const [fileResults, inlineResults] = await Promise.all([
          Promise.allSettled(
            inlineFiles.map((file) => uploadAttachment(saved.id, file.file, "attachment")),
          ),
          Promise.allSettled(
            inlineImages.map((image) => uploadAttachment(saved.id, image.file, "inline")),
          ),
      ]);
      const fileAttachments = fileResults.flatMap((result) => (
        result.status === "fulfilled" ? [result.value] : []
      ));
      const inlineAttachments = inlineResults.flatMap((result) => (
        result.status === "fulfilled" ? [result.value] : []
      ));
      if (
        fileAttachments.length !== inlineFiles.length
        || inlineAttachments.length !== inlineImages.length
      ) {
        postCreateWriteFailed = true;
      } else if (inlineFiles.length > 0 || inlineImages.length > 0) {
        try {
          const description = resolveInlineAttachmentMarkdown(
            resolveInlineMediaMarkdown(
              draft.description,
              inlineImages,
              inlineAttachments,
            ),
            inlineFiles,
            fileAttachments,
          );
          saved = await updateTaskRequest(saved, { ...draft, description });
        } catch {
          postCreateWriteFailed = true;
        }
      }
    }
    const relationUpdates = new Map<string, Task>();
    const movedSubIssues: Array<{ task: Task; previousParentId: string | null }> = [];
    let addedParentId: string | null = null;
    const addedRelatedIds: string[] = [];
    let relationWriteFailed = false;
    if (creating && createOptions) {
      const { parentId, relatedIds, subIssueIds } = createOptions.relations;
      try {
        if (parentId) {
          const result = await addTaskRelation(saved, "parent", parentId);
          saved = result.task;
          addedParentId = parentId;
          relationUpdates.set(result.relatedTask.id, result.relatedTask);
        }
        for (const relatedId of relatedIds) {
          const result = await addTaskRelation(saved, "related", relatedId);
          saved = result.task;
          addedRelatedIds.push(relatedId);
          relationUpdates.set(result.relatedTask.id, result.relatedTask);
        }
        for (const subIssueId of subIssueIds) {
          const child = relationUpdates.get(subIssueId)
            ?? tasksRef.current.find((candidate) => candidate.id === subIssueId)!;
          const previousParentId = child.relations.parent?.id ?? null;
          const result = await addTaskRelation(child, "parent", saved.id);
          movedSubIssues.push({ task: result.task, previousParentId });
          relationUpdates.set(result.task.id, result.task);
          saved = result.relatedTask;
        }
      } catch {
        relationWriteFailed = true;
      }
    }
    relationUpdates.set(saved.id, saved);
    setTasks((current) => sortTasks([
      ...current.filter((task) => !relationUpdates.has(task.id)),
      ...relationUpdates.values(),
    ]));
    if (creating) setNewTaskDraft(null);
    const failedWrites = [
      ...(relationWriteFailed ? [{ zh: "关系", en: "relations" }] : []),
      ...(postCreateWriteFailed ? [{ zh: "正文或媒体", en: "description or media" }] : []),
    ];
    if (!creating || !createOptions?.keepOpen || failedWrites.length > 0) setEditor(null);
    if (failedWrites.length > 0) {
      setActionError(text(
        `${saved.identifier} 已创建，但以下内容写入失败：${failedWrites.map((failure) => failure.zh).join("、")}。`,
        `${saved.identifier} was created, but these follow-up writes failed: ${failedWrites.map((failure) => failure.en).join(", ")}.`,
      ));
    }
    if (creating) {
      pushUndo(null, async () => {
        const restoredRelations = new Map<string, Task>();
        const candidate = tasksRef.current.find((task) => task.id === saved.id);
        let current = candidate && candidate.version >= saved.version ? candidate : saved;
        if (addedParentId) {
          const result = await removeTaskRelation(current, "parent", addedParentId);
          current = result.task;
          restoredRelations.set(result.relatedTask.id, result.relatedTask);
        }
        for (const relatedId of [...addedRelatedIds].reverse()) {
          const result = await removeTaskRelation(current, "related", relatedId);
          current = result.task;
          restoredRelations.set(result.relatedTask.id, result.relatedTask);
        }
        for (const movedSubIssue of [...movedSubIssues].reverse()) {
          const latestChild = tasksRef.current.find((task) => task.id === movedSubIssue.task.id);
          const child = latestChild && latestChild.version >= movedSubIssue.task.version
            ? latestChild
            : movedSubIssue.task;
          const removed = await removeTaskRelation(child, "parent", saved.id);
          restoredRelations.set(removed.task.id, removed.task);
          current = removed.relatedTask;
          if (movedSubIssue.previousParentId) {
            const restored = await addTaskRelation(
              removed.task,
              "parent",
              movedSubIssue.previousParentId,
            );
            restoredRelations.set(restored.task.id, restored.task);
            restoredRelations.set(restored.relatedTask.id, restored.relatedTask);
          }
        }
        await archiveTaskRequest(current);
        setTasks((tasks) => sortTasks([
          ...tasks.filter((task) => task.id !== saved.id && !restoredRelations.has(task.id)),
          ...[...restoredRelations.values()].filter((task) => task.id !== saved.id),
        ]));
      });
    } else if (editor.task) {
      const previous = editor.task;
      const previousAssigneeTarget = assigneeTargetForActor(previous.assignee, currentUser);
      if (!draft.assigneeTarget || previousAssigneeTarget) {
        pushUndo(
          null,
          () => restoreTaskDetails(previous, saved, previousAssigneeTarget),
        );
      }
    }
  }

  async function moveTask(
    task: Task,
    status: TaskStatus,
    beforeTaskId: string | null = null,
    useDropPosition = false,
  ) {
    if (movingTaskId) {
      setDropTarget(null);
      setDraggedTaskId(null);
      setDraggedTaskHeight(0);
      return;
    }

    const destination = tasks.filter((candidate) => (
      candidate.projectId === task.projectId
      && candidate.status === status
      && candidate.id !== task.id
    ));
    const statusChanged = task.status !== status;
    const insertionIndex = statusChanged && !useDropPosition
      ? 0
      : beforeTaskId
        ? destination.findIndex((candidate) => candidate.id === beforeTaskId)
        : destination.length;
    const targetIndex = insertionIndex < 0 ? destination.length : insertionIndex;
    const desiredOrder = [...destination];
    desiredOrder.splice(targetIndex, 0, task);
    const currentOrder = tasks.filter((candidate) => (
      candidate.projectId === task.projectId && candidate.status === status
    ));
    if (
      task.status === status
      && currentOrder.length === desiredOrder.length
      && currentOrder.every((candidate, index) => candidate.id === desiredOrder[index].id)
    ) {
      setDropTarget(null);
      setDraggedTaskId(null);
      setDraggedTaskHeight(0);
      return;
    }
    const previousTask = destination[targetIndex - 1] ?? null;
    const nextTask = destination[targetIndex] ?? null;
    const sortOrder = previousTask && nextTask
      ? (previousTask.sortOrder + nextTask.sortOrder) / 2
      : previousTask
        ? previousTask.sortOrder + 1024
        : nextTask
          ? nextTask.sortOrder - 1024
          : 1024;
    const previous = task;
    setActionError(null);
    setMovingTaskId(task.id);
    setTasks((current) => sortTasks(current.map((candidate) =>
      candidate.id === task.id ? { ...candidate, status, sortOrder } : candidate,
    )));

    try {
      const moved = await moveTaskRequest(task, status, sortOrder);
      setTasks((current) => sortTasks(current.map((candidate) =>
        candidate.id === moved.id ? moved : candidate,
      )));
      pushUndo(null, async () => {
        const candidate = tasksRef.current.find((current) => current.id === moved.id);
        const current = candidate && candidate.version >= moved.version ? candidate : moved;
        const restored = await moveTaskRequest(current, previous.status, previous.sortOrder);
        setTasks((tasks) => sortTasks(tasks.map((item) => item.id === restored.id ? restored : item)));
      });
    } catch (error) {
      setTasks((current) => sortTasks(current.map((candidate) =>
        candidate.id === previous.id ? previous : candidate,
      )));
      setActionError(error instanceof ApiError && error.code === "VERSION_CONFLICT"
        ? textRef.current(
          "该议题已在其他位置更新，看板已重新同步。",
          "This issue changed elsewhere. The board has been synced.",
        )
        : errorMessage(error));
      if (taskScopeProjectId) void refreshTasks(taskScopeProjectId, { quiet: true });
    } finally {
      setMovingTaskId(null);
      setDropTarget(null);
      setDraggedTaskId(null);
      setDraggedTaskHeight(0);
    }
  }

  function startTaskDrag(task: Task, height: number) {
    setDraggedTaskId(task.id);
    setDraggedTaskHeight(height);
    setDropTarget(task.status);
  }

  function endTaskDrag() {
    setDraggedTaskId(null);
    setDraggedTaskHeight(0);
    setDropTarget(null);
  }

  function finishTaskDrop(destination: TaskStatus, taskId: string, beforeTaskId: string | null = null) {
    const task = tasks.find((candidate) => candidate.id === taskId);
    setDraggedTaskId(null);
    setDraggedTaskHeight(0);
    setDropTarget(null);
    if (!task) return;
    setSettlingTaskId(task.id);
    window.setTimeout(() => {
      setSettlingTaskId((current) => current === task.id ? null : current);
    }, 220);
    void moveTask(task, destination, beforeTaskId, true);
  }

  async function updateTaskProperties(task: Task, changes: Partial<TaskDraft>): Promise<Task> {
    const previous = task;
    const { assigneeTarget, ...taskChanges } = changes;
    const optimisticAssignee = assigneeTarget
      ? actorForAssigneeTarget(assigneeTarget, currentUser)
      : task.assignee;
    const optimisticParticipants = assigneeTarget
      && !task.participants.some((participant) => actorKey(participant) === actorKey(optimisticAssignee))
      ? [...task.participants, optimisticAssignee]
      : task.participants;
    setActionError(null);
    setTasks((current) => current.map((candidate) =>
      candidate.id === task.id
        ? { ...candidate, ...taskChanges, assignee: optimisticAssignee, participants: optimisticParticipants }
        : candidate,
    ));

    try {
      const updated = await updateTaskRequest(task, { ...taskToDraft(task), ...changes });
      setTasks((current) => sortTasks(current.map((candidate) =>
        candidate.id === updated.id ? updated : candidate,
      )));
      const previousAssigneeTarget = assigneeTargetForActor(previous.assignee, currentUser);
      if (!assigneeTarget || previousAssigneeTarget) {
        pushUndo(
          null,
          () => restoreTaskDetails(previous, updated, previousAssigneeTarget),
        );
      }
      return updated;
    } catch (error) {
      setTasks((current) => sortTasks(current.map((candidate) =>
        candidate.id === previous.id ? previous : candidate,
      )));
      setActionError(error instanceof ApiError && error.code === "VERSION_CONFLICT"
        ? text(
          "该议题已在其他位置更新，看板已重新同步。",
          "This issue changed elsewhere. The board has been synced.",
        )
        : errorMessage(error));
      if (taskScopeProjectId) void refreshTasks(taskScopeProjectId, { quiet: true });
      throw error;
    }
  }

  async function persistProjectLabel(label: string, projectId = selectedProjectId) {
    setActionError(null);
    try {
      const project = await createProjectLabelRequest(projectId, label);
      setProjects((current) => current.map((candidate) => (
        candidate.id === project.id ? project : candidate
      )));
    } catch (error) {
      setActionError(errorMessage(error));
      throw error;
    }
  }

  async function removeProjectLabel(label: string) {
    setActionError(null);
    try {
      const project = await deleteProjectLabelRequest(selectedProjectId, label);
      setProjects((current) => current.map((candidate) => (
        candidate.id === project.id ? project : candidate
      )));
      await refreshTasks(taskScopeProjectId, { quiet: true });
    } catch (error) {
      setActionError(errorMessage(error));
      throw error;
    }
  }

  async function mutateTaskRelation(
    action: "add" | "remove",
    task: Task,
    type: IssueRelationType,
    relatedTaskId: string,
    origin?: IssueRelationOrigin,
  ) {
    setActionError(null);
    try {
      const result = action === "add"
        ? await addTaskRelation(task, type, relatedTaskId, undefined, origin)
        : await removeTaskRelation(task, type, relatedTaskId, undefined, origin);
      setTasks((current) => sortTasks(current.map((candidate) => {
        if (candidate.id === result.task.id) return result.task;
        if (candidate.id === result.relatedTask.id) return result.relatedTask;
        return candidate;
      })));
      if (taskScopeProjectId) void refreshTasks(taskScopeProjectId, { quiet: true });
      return result;
    } catch (error) {
      setActionError(error instanceof ApiError && error.code === "VERSION_CONFLICT"
        ? text(
          "该议题已在其他位置更新，看板已重新同步。",
          "This issue changed elsewhere. The board has been synced.",
        )
        : errorMessage(error));
      if (taskScopeProjectId) void refreshTasks(taskScopeProjectId, { quiet: true });
      throw error;
    }
  }

  async function duplicateTask(task: Task) {
    setActionError(null);
    try {
      const duplicated = await createTaskRequest(task.projectId, {
        ...taskToDraft(task),
        assigneeTarget: assigneeTargetForActor(task.assignee, currentUser),
        developmentContext: null,
      });
      setTasks((current) => sortTasks([...current, duplicated]));
      pushUndo(text(
        `${duplicated.identifier} 副本已创建。`,
        `${duplicated.identifier} copy was created.`,
      ), async () => {
        const candidate = tasksRef.current.find((current) => current.id === duplicated.id);
        const current = candidate && candidate.version >= duplicated.version ? candidate : duplicated;
        await archiveTaskRequest(current);
        setTasks((tasks) => tasks.filter((item) => item.id !== duplicated.id));
      });
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  async function archiveTask(task: Task) {
    setActionError(null);
    try {
      const archived = await archiveTaskRequest(task);
      setTasks((current) => current.filter((candidate) => candidate.id !== task.id));
      setArchivedTasks((current) => sortTasks([
        ...current.filter((candidate) => candidate.id !== archived.id),
        archived,
      ]));
      pushUndo(text(`${task.identifier} 已归档。`, `${task.identifier} was archived.`), async () => {
        const restored = await restoreTaskRequest(archived);
        setArchivedTasks((current) => current.filter((candidate) => candidate.id !== restored.id));
        setTasks((current) => sortTasks([
          ...current.filter((candidate) => candidate.id !== restored.id),
          restored,
        ]));
      });
    } catch (error) {
      setActionError(error instanceof ApiError && error.code === "VERSION_CONFLICT"
        ? text(
          "该议题已在其他位置更新，看板已重新同步。",
          "This issue changed elsewhere. The board has been synced.",
        )
        : errorMessage(error));
      if (taskScopeProjectId) void refreshTasks(taskScopeProjectId, { quiet: true });
    }
  }

  async function restoreArchivedTask(task: Task) {
    setActionError(null);
    setRestoringTaskId(task.id);
    try {
      const restored = await restoreTaskRequest(task);
      setArchivedTasks((current) => current.filter((candidate) => candidate.id !== restored.id));
      setTasks((current) => sortTasks([
        ...current.filter((candidate) => candidate.id !== restored.id),
        restored,
      ]));
      setAnnouncement(text(
        `${restored.identifier} 已恢复。`,
        `${restored.identifier} was restored.`,
      ));
    } catch (error) {
      setActionError(error instanceof ApiError && error.code === "VERSION_CONFLICT"
        ? text(
          "该议题已在其他位置更新，看板已重新同步。",
          "This issue changed elsewhere. The board has been synced.",
        )
        : errorMessage(error));
      if (taskScopeProjectId) void refreshTasks(taskScopeProjectId, { quiet: true });
    } finally {
      setRestoringTaskId(null);
    }
  }

  async function deletePendingArchivedTask() {
    if (!pendingArchivedTaskDelete || deletingArchivedTaskId) return;
    const task = pendingArchivedTaskDelete;
    setActionError(null);
    setDeletingArchivedTaskId(task.id);
    try {
      await deleteArchivedTaskRequest(task);
      setArchivedTasks((current) => current.filter((candidate) => candidate.id !== task.id));
      setPendingArchivedTaskDelete(null);
      setAnnouncement(text(
        `${task.identifier} 已永久删除。`,
        `${task.identifier} was permanently deleted.`,
      ));
    } catch (error) {
      setActionError(error instanceof ApiError && error.code === "VERSION_CONFLICT"
        ? text(
          "该议题已在其他位置更新，看板已重新同步。",
          "This issue changed elsewhere. The board has been synced.",
        )
        : errorMessage(error));
      if (taskScopeProjectId) void refreshTasks(taskScopeProjectId, { quiet: true });
    } finally {
      setDeletingArchivedTaskId(null);
    }
  }

  async function copyText(content: string, message: string) {
    try {
      await navigator.clipboard.writeText(content);
      setAnnouncement(message);
    } catch {
      setActionError(text("无法写入剪贴板。", "Could not write to the clipboard."));
    }
  }

  function openThread(binding: CodexThreadBinding) {
    if (binding.codexProjectKind === "remote") {
      setActionError(text(
        "请在 Codex App 中打开该 SSH 远程对话。",
        "Open this SSH remote conversation in the Codex app.",
      ));
      return;
    }
    window.location.assign(`codex://threads/${encodeURIComponent(binding.threadId.trim())}`);
  }

  function openLegacyLocalThread(threadId: string) {
    window.location.assign(`codex://threads/${encodeURIComponent(threadId.trim())}`);
  }

  function openTaskConversation(conversation: TaskConversationItem) {
    if (conversation.threadBinding) {
      openThread(conversation.threadBinding);
    } else if (conversation.legacyLocalThreadId) {
      openLegacyLocalThread(conversation.legacyLocalThreadId);
    }
  }

  function changeProject(projectId: string) {
    closeContextMenu();
    setProjectContextMenu(null);
    setProjectMenuOpen(false);
    detailSourceProjectIdRef.current = null;
    setDetailTaskIdentifier(null);
    setBoardView(projectId === ALL_PROJECTS_ID ? "issues" : readProjectBoardView(projectId));
    if (projectId !== ALL_PROJECTS_ID) rememberProjectOpen(projectId);
    setSelectedProjectId(projectId);
    setSearch("");
    setFilters(EMPTY_TASK_FILTERS);
    setActionError(null);
    undoStackRef.current = [];
    setUndoNotice(null);
    const url = buildIssueUrl(window.location.href, projectId, null);
    window.history.replaceState(null, "", url);
  }

  async function selectProject(choice: ProjectChoice) {
    if (openingProjectId) return;
    setOpeningProjectId(choice.id);
    setActionError(null);
    try {
      let project = projects.find((candidate) => candidate.id === choice.id) ?? null;
      if (!project) {
        try {
          project = await createProjectRequest({
            id: choice.id,
            name: choice.name,
            workspacePath: null,
          });
          setProjects((current) => [...current, project!]);
        } catch (error) {
          if (!(error instanceof ApiError) || error.code !== "PROJECT_EXISTS") throw error;
          const nextProjects = await listProjects();
          setProjects(nextProjects);
          project = nextProjects.find((candidate) => candidate.id === choice.id) ?? null;
          if (!project) throw error;
        }
      }
      changeProject(project.id);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setOpeningProjectId(null);
    }
  }

  function openCreateProjectDialog() {
    setProjectMenuOpen(false);
    setProjectContextMenu(null);
    setProjectName("");
    setActionError(null);
    setProjectCreateOpen(true);
  }

  function closeCreateProjectDialog() {
    if (openingProjectId) return;
    setProjectCreateOpen(false);
    setActionError(null);
  }

  async function createTemporaryProject() {
    if (openingProjectId) return;
    const name = projectName.trim();
    if (!name) return;
    const projectId = `temp-${window.crypto.randomUUID()}`;
    setOpeningProjectId(projectId);
    setActionError(null);
    try {
      const project = await createProjectRequest({
        id: projectId,
        name,
        workspacePath: null,
      });
      setProjects((current) => [...current, project]);
      setProjectCreateOpen(false);
      changeProject(project.id);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setOpeningProjectId(null);
    }
  }

  function requestProjectDelete(project: ProjectChoice) {
    setProjectMenuOpen(false);
    setProjectContextMenu(null);
    setProjectDeleteIssueCount(null);
    setPendingProjectDelete(project);
  }

  function closeProjectDeleteDialog() {
    if (deletingProjectId) return;
    setPendingProjectDelete(null);
    setProjectDeleteIssueCount(null);
  }

  async function deletePendingProject() {
    if (!pendingProjectDelete || deletingProjectId) return;
    const project = pendingProjectDelete;
    setDeletingProjectId(project.id);
    setActionError(null);
    try {
      await deleteProjectRequest(project.id);
      setProjects((current) => current.filter((candidate) => candidate.id !== project.id));
      setRecentProjectIds((current) => {
        const next = current.filter((candidate) => candidate !== project.id);
        taskboardStorage.setItem(RECENT_PROJECT_IDS_KEY, JSON.stringify(next));
        return next;
      });
      setPendingProjectDelete(null);
      setProjectDeleteIssueCount(null);
      if (selectedProjectId === project.id) changeProject(GLOBAL_PROJECT_ID);
      setAnnouncement(text(
        `已删除项目“${project.name}”`,
        `Deleted project “${project.name}”`,
      ));
    } catch (error) {
      if (error instanceof ApiError && error.code === "PROJECT_NOT_EMPTY") {
        const details = error.details as { issueCount: number };
        setProjectDeleteIssueCount(details.issueCount);
      } else {
        setPendingProjectDelete(null);
        setActionError(errorMessage(error));
      }
    } finally {
      setDeletingProjectId(null);
    }
  }

  const headerProjectName = isAllProjects
    ? text("所有项目", "All projects")
    : selectedProject?.id === GLOBAL_PROJECT_ID
      ? text("临时任务", "Temporary tasks")
      : selectedProject?.name ?? text("任务面板", "Taskboard");
  return (
    <TaskboardLanguageProvider language={language}>
      <div className="app-shell">
      <LocalRealtimeSync
        selectedProjectId={taskScopeProjectId}
        detailTaskId={detailTaskId}
        refreshProjectList={refreshProjectList}
        refreshTasks={refreshTasks}
        refreshProjectBoardDisplaySettings={refreshProjectBoardDisplaySettings}
        setConnection={setConnection}
        setCommentsRevision={setCommentsRevision}
        setAttachmentsRevision={setAttachmentsRevision}
        setReadmeRevision={setReadmeRevision}
      />
      <main className="workspace">
        <header className="workspace-header">
          <div className="workspace-title">
            <div className="workspace-kicker">
              {detailTask && (
                <button
                  className="detail-back-button"
                  type="button"
                  aria-label={text("返回议题看板", "Back to issue board")}
                  title={text("返回议题看板 (Esc)", "Back to issue board (Esc)")}
                  onClick={closeTaskDetail}
                >
                  <LinearIcon name="chevronLeft" />
                </button>
              )}
              <div className="header-project-switcher" data-project-switcher>
                <button
                  className="header-project-button"
                  type="button"
                  aria-label={text("切换项目", "Switch project")}
                  aria-haspopup="menu"
                  aria-expanded={projectMenuOpen}
                  onClick={() => {
                    setProjectContextMenu(null);
                    setProjectMenuSearch("");
                    setProjectMenuOpen((current) => !current);
                  }}
                >
                  <span className="project-name">{headerProjectName}</span>
                  <TaskboardIcon className="project-switcher-chevron" name="dropdown" />
                </button>
                {projectMenuOpen && (
                  <div className="header-project-menu" role="menu" aria-label={text("项目", "Projects")}>
                    <span>{text("切换项目", "Switch project")}</span>
                    <div className="project-menu-search">
                      <label className="sr-only" htmlFor="project-menu-search-input">
                        {text("按名称筛选项目", "Filter projects by name")}
                      </label>
                      <TaskboardIcon name="search" />
                      <input
                        id="project-menu-search-input"
                        autoFocus
                        type="search"
                        value={projectMenuSearch}
                        onChange={(event) => setProjectMenuSearch(event.target.value)}
                        placeholder={text("筛选项目…", "Filter projects…")}
                      />
                      {projectMenuSearch && (
                        <button
                          className="search-clear"
                          type="button"
                          aria-label={text("清除项目筛选", "Clear project filter")}
                          onClick={() => setProjectMenuSearch("")}
                        >
                          <LinearIcon name="close" />
                        </button>
                      )}
                    </div>
                    <div className="project-menu-list">
                      {!projectMenuNeedle && (
                        <>
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={isAllProjects}
                            disabled={openingProjectId !== null}
                            onClick={() => {
                              if (isAllProjects) setProjectMenuOpen(false);
                              else changeProject(ALL_PROJECTS_ID);
                            }}
                          >
                            <TaskboardIcon className="project-avatar" name="projectFolder" />
                            <span>{text("所有项目", "All projects")}</span>
                            {isAllProjects && <span className="project-menu-check" aria-hidden="true"><LinearIcon name="check" /></span>}
                          </button>
                          <div className="project-menu-divider" role="separator" />
                        </>
                      )}
                      {projectMenuChoices.map((project) => (
                        <Fragment key={project.id}>
                          {hasProjectsWithIssues && project.id === firstEmptyProjectId && (
                            <div className="project-menu-divider" role="separator" />
                          )}
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={project.id === selectedProjectId}
                            disabled={openingProjectId !== null}
                            onContextMenu={project.id.startsWith("temp-") ? (event) => {
                              event.preventDefault();
                              setProjectContextMenu({
                                project,
                                x: event.clientX,
                                y: event.clientY,
                              });
                            } : undefined}
                            onClick={() => {
                              if (project.id === selectedProjectId) setProjectMenuOpen(false);
                              else void selectProject(project);
                            }}
                          >
                            <TaskboardIcon className="project-avatar" name="projectFolder" />
                            <span>{project.name}</span>
                            {project.id === selectedProjectId && <span className="project-menu-check" aria-hidden="true"><LinearIcon name="check" /></span>}
                          </button>
                        </Fragment>
                      ))}
                      {projectMenuNeedle && projectMenuChoices.length === 0 && (
                        <div className="project-menu-empty">{text("没有匹配项目", "No matching projects")}</div>
                      )}
                    </div>
                    <div className="project-menu-actions">
                      <div className="project-menu-divider" role="separator" />
                      <button
                        type="button"
                        role="menuitem"
                        disabled={openingProjectId !== null}
                        onClick={openCreateProjectDialog}
                      >
                        <PlusIcon className="project-avatar" color="currentColor" size={16} />
                        <span>{text("创建项目", "Create project")}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div ref={dragRegionRef} className="workspace-drag-region" aria-hidden="true" />

          <div className="header-actions">
            {selectedProjectId && (
              <button
                className="icon-button header-create-button"
                type="button"
                onClick={() => setEditor({ task: null, status: "todo" })}
                aria-label={text("新建议题", "Create issue")}
                title={text("新建议题 (C)", "Create issue (C)")}
              >
                <PlusIcon color="currentColor" size={14} />
              </button>
            )}
          </div>
        </header>

        {selectedProjectId && !detailTask && <div className="board-toolbar">
          <div className="view-tabs" aria-label={text("看板视图", "Board views")}>
            <button
              className={`view-tab${boardView === "dashboard" ? " active" : ""}`}
              type="button"
              aria-pressed={boardView === "dashboard"}
              onClick={() => selectBoardView("dashboard")}
            >
              {text("仪表盘", "Dashboard")}
            </button>
            <button
              className={`view-tab${boardView === "issues" ? " active" : ""}`}
              type="button"
              aria-pressed={boardView === "issues"}
              onClick={() => selectBoardView("issues")}
            >
              {text("议题看板", "Issue board")}
            </button>
            <button
              className={`view-tab${boardView === "list" ? " active" : ""}`}
              type="button"
              aria-pressed={boardView === "list"}
              onClick={() => selectBoardView("list")}
            >
              {text("列表视图", "List")}
            </button>
            <button
              className={`view-tab${boardView === "gantt" ? " active" : ""}`}
              type="button"
              aria-pressed={boardView === "gantt"}
              onClick={() => selectBoardView("gantt")}
            >
              {text("甘特图", "Gantt")}
            </button>
            {!isAllProjects && (
              <button
                className={`view-tab${boardView === "readme" ? " active" : ""}`}
                type="button"
                aria-pressed={boardView === "readme"}
                onClick={() => selectBoardView("readme")}
              >
                {text("项目文档", "Project Docs")}
              </button>
            )}
          </div>
          {(boardView === "issues" || boardView === "list" || boardView === "gantt") && <div className="toolbar-tools">
            <div className={`search-field${search ? " has-value" : ""}`} title={text("搜索议题 (/)", "Search issues (/)")}>
              <TaskboardIcon className="search-icon" name="search" />
              <input
                id="task-search"
                type="search"
                aria-label={text("搜索议题", "Search issues")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={text("搜索议题…", "Search issues…")}
              />
              {!search && <kbd>/</kbd>}
              {search && (
                <button
                  className="search-clear"
                  type="button"
                  aria-label={text("清除搜索", "Clear search")}
                  onClick={() => {
                    setSearch("");
                    document.getElementById("task-search")?.focus();
                  }}
                >
                  <LinearIcon name="close" />
                </button>
              )}
            </div>
            {boardView === "gantt" && (
              <div className="gantt-toolbar-controls">
                <label className="gantt-hide-completed">
                  <input type="checkbox" checked={ganttHideCompleted} onChange={(event) => setGanttHideCompleted(event.target.checked)} />
                  <i><LinearIcon name="check" /></i>
                  <span>{text("隐藏已完成", "Hide completed")}</span>
                </label>
                <button type="button" className="gantt-today-button" onClick={() => setGanttTodayRequest((current) => current + 1)}>{text("今天", "Today")}</button>
                <div className="gantt-view-menu-wrap">
                  <button type="button" className="gantt-view-menu-trigger" aria-label={text("时间轴视图选项", "Timeline view options")} aria-expanded={ganttViewMenuOpen} onClick={() => setGanttViewMenuOpen((current) => !current)}>
                    <MoreIcon color="currentColor" />
                  </button>
                  {ganttViewMenuOpen && (
                    <div className="gantt-view-menu" role="menu">
                      {GANTT_ZOOM_OPTIONS.map((value) => (
                        <button type="button" role="menuitemradio" aria-checked={ganttZoom === value} className={ganttZoom === value ? "active" : ""} onClick={() => { setGanttZoom(value); setGanttViewMenuOpen(false); }} key={value}>
                          <span>{language === "zh"
                            ? { day: "日视图", week: "周视图", month: "月视图" }[value]
                            : { day: "Day", week: "Week", month: "Month" }[value]}</span>
                          {ganttZoom === value && <LinearIcon name="check" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <TaskFilterMenu
              tasks={tasks}
              search={search}
              labels={availableLabels}
              filters={filters}
              onChange={setFilters}
            />
            {boardView === "issues" && (isAllProjects || selectedProject) && (
              <BoardCardDisplayMenu
                settings={boardDisplaySettings}
                onChange={updateProjectBoardDisplaySettings}
                onReset={resetProjectBoardDisplaySettings}
              />
            )}
            {boardView === "issues" && otherTasksAvailable && (
              <button
                className={`other-tasks-trigger${otherTasksOpen ? " is-open" : ""}`}
                type="button"
                aria-controls="other-tasks-panel"
                aria-expanded={otherTasksOpen}
                aria-label={otherTasksOpen
                  ? text("关闭其他任务", "Close other issues")
                  : text("打开其他任务", "Open other issues")}
                title={text("其他任务", "Other issues")}
                onClick={() => setOtherTasksOpen((current) => !current)}
              >
                <TaskboardIcon name="panel" />
              </button>
            )}
          </div>}
        </div>}

        {(loadError || actionErrorText) && (
          <div className="error-banner" role="alert">
            <span className="error-mark" aria-hidden="true"><LinearIcon name="alert" /></span>
            <div><strong>{text("任务面板需要处理", "Taskboard needs attention")}</strong><p>{actionErrorText ?? loadError?.message}</p></div>
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                if (loadError?.source === "projects") {
                  if (loadError.operation === "initial") void loadProjectList();
                  else void refreshProjectList();
                } else if (taskScopeProjectId) void refreshTasks(taskScopeProjectId);
                else void loadProjectList();
              }}
            >
              {text("重试", "Try again")}
            </button>
          </div>
        )}

        {detailTask && selectedProject ? (
          <TaskDetail
            key={detailTask.id}
            task={detailTask}
            tasks={tasks.filter((task) => task.projectId === detailTask.projectId)}
            referenceTasks={referenceTasks.filter((task) => task.projectId === detailTask.projectId)}
            currentUser={currentUser}
            availableLabels={availableLabels}
            developmentScan={developmentScan}
            developmentScanLoading={developmentScanLoading}
            commentsRevision={commentsRevision}
            attachmentsRevision={attachmentsRevision}
            onCreateLabel={persistProjectLabel}
            onDeleteLabel={removeProjectLabel}
            onUpdate={(current, changes) => updateTaskProperties(current, changes)}
            onOpenTask={openTaskDetail}
            onAddRelation={(current, type, relatedTaskId, origin) => (
              mutateTaskRelation("add", current, type, relatedTaskId, origin)
            )}
            onRemoveRelation={(current, type, relatedTaskId, origin) => (
              mutateTaskRelation("remove", current, type, relatedTaskId, origin)
            )}
            onOpenThread={openThread}
            onOpenLegacyLocalThread={openLegacyLocalThread}
            onCopy={(text, message) => void copyText(text, message)}
            onError={setActionError}
          />
        ) : boardView !== "readme"
          && hasLoadedTasks
          && tasks.length === 0
          && selectedProject ? (
          <div className="page-empty">
            <h2>{text("当前项目还没有任务", "This project has no issues yet")}</h2>
            <div className="page-empty-actions">
              <button
                className="button primary"
                type="button"
                onClick={() => setEditor({ task: null, status: "todo" })}
              >
                {text("添加议题", "Add issue")}
              </button>
            </div>
          </div>
        ) : boardView === "readme" && selectedProject ? (
          <ProjectReadmeView
            key={selectedProjectId}
            project={selectedProject}
            tasks={tasks.filter((task) => task.projectId === selectedProject.id)}
            referenceTasks={referenceTasks.filter((task) => task.projectId === selectedProject.id)}
            revision={readmeRevision}
            onOpenTask={openTaskDetail}
            onError={setActionError}
          />
        ) : boardView === "dashboard" && (selectedProject || isAllProjects) ? (
          <DashboardView
            key={selectedProjectId}
            projectCreatedAt={selectedProject?.createdAt ?? null}
            isAllProjects={isAllProjects}
            tasks={tasks}
            presentations={taskPresentations}
            onOpenTask={openTaskDetail}
            onOpenConversation={openTaskConversation}
          />
        ) : boardView === "list" ? (
          <IssueListView
            scrollRef={issueListRef}
            tasks={filteredTasks}
            presentations={taskPresentations}
            currentUser={currentUser}
            hasActiveFilters={hasActiveTaskFilters}
            onOpenTask={openTaskDetail}
            onOpenConversation={openTaskConversation}
            onUpdate={updateTaskProperties}
          />
        ) : boardView === "gantt" ? (
          <Suspense fallback={<div className="board-view-loading">{text("正在打开甘特图…", "Opening Gantt…")}</div>}>
            <GanttView
              tasks={filteredTasks}
              presentations={taskPresentations}
              hasActiveFilters={hasActiveTaskFilters}
              zoom={ganttZoom}
              hideCompleted={ganttHideCompleted}
              todayRequest={ganttTodayRequest}
              onOpenTask={openTaskDetail}
              onUpdate={updateTaskProperties}
            />
          </Suspense>
        ) : (
          <div
            className={`issue-board-layout${otherTasksAvailable && otherTasksVisible ? " has-other-tasks" : ""}`}
            data-main-columns={mainBoardItems.length}
            style={{
              "--main-column-count": mainColumnCount,
              "--main-board-min-width": `${mainBoardMinWidth}px`,
              "--main-board-max-width": `${mainBoardMaxWidth}px`,
              "--other-tasks-width": otherTasksWidth,
            } as CSSProperties}
          >
            {tasksLoading && !hasLoadedTasks ? (
              <div className="loading-board" aria-label={text("正在加载议题", "Loading issues")} aria-busy="true">
                {mainBoardItems.map((item) => (
                  <div className="loading-column" key={item}>
                    <span /><div /><div />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div ref={boardScrollRef} className="board-scroll" aria-label={text("议题看板", "Issue board")}>
                  <div className="board">
                    {mainBoardItems.map((item) => item === "archived" ? (
                      <ArchivedTasksColumn
                        key={item}
                        tasks={filteredArchivedTasks}
                        hasActiveFilters={hasActiveTaskFilters}
                        restoringTaskId={restoringTaskId}
                        deletingTaskId={deletingArchivedTaskId}
                        onRestore={(task) => void restoreArchivedTask(task)}
                        onDelete={setPendingArchivedTaskDelete}
                      />
                    ) : (
                      <BoardColumn
                        key={item}
                        scrollRef={(element) => {
                          boardColumnScrollRefs.current[item] = element;
                        }}
                        status={item}
                        tasks={tasksByStatus[item]}
                        presentations={taskPresentations}
                        now={processingNow}
                        emptyMessage={hasActiveTaskFilters
                          ? text("当前筛选下无匹配议题", "No issues match the current filters")
                          : text("暂无议题", "No issues")}
                        isDropTarget={dropTarget === item}
                        draggedTaskId={draggedTaskId}
                        draggedTaskHeight={draggedTaskHeight}
                        movingTaskId={movingTaskId}
                        settlingTaskId={settlingTaskId}
                        contextMenuTaskId={contextMenu?.taskId ?? null}
                        availableLabels={availableLabels}
                        projectNames={isAllProjects ? projectNames : undefined}
                        currentUser={currentUser}
                        showCover={boardDisplaySettings.cover}
                        showBody={boardDisplaySettings.body}
                        createEnabled
                        onCreateLabel={persistProjectLabel}
                        onCreate={(initialStatus) => setEditor({ task: null, status: initialStatus })}
                        onEdit={openTaskDetail}
                        onUpdate={updateTaskProperties}
                        onComplete={(task) => moveTask(task, "done")}
                        onContextMenu={openTaskContextMenu}
                        onDragStart={startTaskDrag}
                        onDragEnd={endTaskDrag}
                        onDragEnter={setDropTarget}
                        onDrop={finishTaskDrop}
                        onOpenConversation={openTaskConversation}
                      />
                    ))}
                  </div>
                </div>
                {otherTasksAvailable && otherTasksMounted && (
                  <OtherTasksPanel
                    open={otherTasksVisible}
                    activeTab={otherTasksTab}
                    tabs={otherTaskTabs}
                    tasksByStatus={tasksByStatus}
                    archivedTasks={filteredArchivedTasks}
                    presentations={taskPresentations}
                    now={processingNow}
                    hasActiveFilters={hasActiveTaskFilters}
                    isDropTarget={otherTasksTab !== "archived" && dropTarget === otherTasksTab}
                    draggedTaskId={draggedTaskId}
                    draggedTaskHeight={draggedTaskHeight}
                    movingTaskId={movingTaskId}
                    settlingTaskId={settlingTaskId}
                    contextMenuTaskId={contextMenu?.taskId ?? null}
                    availableLabels={availableLabels}
                    projectNames={isAllProjects ? projectNames : undefined}
                    currentUser={currentUser}
                    showCover={boardDisplaySettings.cover}
                    showBody={boardDisplaySettings.body}
                    onCreateLabel={persistProjectLabel}
                    restoringTaskId={restoringTaskId}
                    deletingTaskId={deletingArchivedTaskId}
                    onTabChange={setOtherTasksTab}
                    onCreate={(initialStatus) => setEditor({ task: null, status: initialStatus })}
                    onRestore={(task) => void restoreArchivedTask(task)}
                    onDelete={setPendingArchivedTaskDelete}
                    onEdit={openTaskDetail}
                    onUpdate={updateTaskProperties}
                    onContextMenu={openTaskContextMenu}
                    onDragStart={startTaskDrag}
                    onDragEnd={endTaskDrag}
                    onDragEnter={setDropTarget}
                    onDrop={finishTaskDrop}
                    onOpenConversation={openTaskConversation}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {projectContextMenu && (
        <div
          className="task-context-menu project-context-menu"
          data-project-context-menu
          role="menu"
          aria-label={text(
            `项目“${projectContextMenu.project.name}”`,
            `Project “${projectContextMenu.project.name}”`,
          )}
          style={{ left: projectContextMenu.x, top: projectContextMenu.y }}
        >
          <button
            className="context-menu-item is-danger"
            type="button"
            role="menuitem"
            onClick={() => requestProjectDelete(projectContextMenu.project)}
          >
            <span className="context-menu-icon" aria-hidden="true"><DeleteIcon color="currentColor" /></span>
            <span className="context-menu-label">{text("删除项目", "Delete project")}</span>
          </button>
        </div>
      )}

      {projectCreateOpen && (
        <div
          className="delete-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeCreateProjectDialog();
          }}
        >
          <form
            className="delete-dialog project-create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-create-title"
            onSubmit={(event) => {
              event.preventDefault();
              void createTemporaryProject();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeCreateProjectDialog();
            }}
          >
            <h2 id="project-create-title">{text("创建项目", "Create project")}</h2>
            <label>
              <span>{text("项目名称", "Project name")}</span>
              <input
                autoFocus
                maxLength={120}
                required
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </label>
            {actionErrorText && <p className="project-dialog-error">{actionErrorText}</p>}
            <div>
              <button
                className="button secondary"
                type="button"
                disabled={openingProjectId !== null}
                onClick={closeCreateProjectDialog}
              >
                {text("取消", "Cancel")}
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={!projectName.trim() || openingProjectId !== null}
              >
                {openingProjectId
                  ? text("创建中…", "Creating…")
                  : text("创建", "Create")}
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingProjectDelete && (
        <div
          className="delete-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeProjectDeleteDialog();
          }}
        >
          <div
            className="delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="project-delete-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeProjectDeleteDialog();
            }}
          >
            {projectDeleteIssueCount === null ? (
              <>
                <h2 id="project-delete-title">{text(
                  `删除项目“${pendingProjectDelete.name}”？`,
                  `Delete project “${pendingProjectDelete.name}”?`,
                )}</h2>
                <p>{text(
                  "仅空项目可以删除。删除后无法恢复。",
                  "Only empty projects can be deleted. This cannot be undone.",
                )}</p>
                <div>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={deletingProjectId !== null}
                    onClick={closeProjectDeleteDialog}
                  >
                    {text("取消", "Cancel")}
                  </button>
                  <button
                    className="button danger"
                    type="button"
                    disabled={deletingProjectId !== null}
                    onClick={() => void deletePendingProject()}
                  >
                    {deletingProjectId
                      ? text("删除中…", "Deleting…")
                      : text("删除项目", "Delete project")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="project-delete-title">{text(
                  `无法删除项目“${pendingProjectDelete.name}”`,
                  `Cannot delete project “${pendingProjectDelete.name}”`,
                )}</h2>
                <p>{text(
                  `该项目还有 ${projectDeleteIssueCount} 个议题（包含已归档议题）。请先移动或删除这些议题。`,
                  `This project still has ${projectDeleteIssueCount} issues, including archived issues. Move or delete them first.`,
                )}</p>
                <div>
                  <button className="button primary" type="button" onClick={closeProjectDeleteDialog}>
                    {text("知道了", "Got it")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {pendingArchivedTaskDelete && (
        <div
          className="delete-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget && !deletingArchivedTaskId) {
              setPendingArchivedTaskDelete(null);
            }
          }}
        >
          <div
            className="delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archived-task-delete-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !deletingArchivedTaskId) {
                setPendingArchivedTaskDelete(null);
              }
            }}
          >
            <h2 id="archived-task-delete-title">{text(
              `永久删除 ${pendingArchivedTaskDelete.identifier}？`,
              `Permanently delete ${pendingArchivedTaskDelete.identifier}?`,
            )}</h2>
            <p>{text(
              `“${pendingArchivedTaskDelete.title}”及其评论和附件将被永久删除，此操作无法撤销。`,
              `“${pendingArchivedTaskDelete.title}” and its comments and attachments will be permanently deleted. This cannot be undone.`,
            )}</p>
            <div>
              <button
                className="button secondary"
                type="button"
                disabled={deletingArchivedTaskId !== null}
                onClick={() => setPendingArchivedTaskDelete(null)}
              >
                {text("取消", "Cancel")}
              </button>
              <button
                className="button danger"
                type="button"
                disabled={deletingArchivedTaskId !== null}
                onClick={() => void deletePendingArchivedTask()}
              >
                {deletingArchivedTaskId
                  ? text("删除中…", "Deleting…")
                  : text("永久删除", "Delete permanently")}
              </button>
            </div>
          </div>
        </div>
      )}

      {editor && (
        <TaskEditor
          key={editor.task?.id ?? `new-${selectedProjectId}-${editor.status}`}
          projectId={editorProjectId}
          projectOptions={!editor.task && isAllProjects ? createTargetProjects : undefined}
          onProjectChange={(projectId) => setEditor((current) => (
            current ? { ...current, projectId } : current
          ))}
          task={editor.task}
          tasks={tasks.filter((task) => task.projectId === editorProjectId)}
          referenceTasks={referenceTasks.filter((task) => task.projectId === editorProjectId)}
          initialStatus={editor.status}
          initialDraft={editor.task || newTaskDraft?.projectId !== selectedProjectId
            ? null
            : newTaskDraft.draft}
          labels={projects.find((project) => project.id === editorProjectId)?.labels ?? []}
          currentUser={currentUser}
          developmentScan={developmentScan}
          developmentScanLoading={developmentScanLoading}
          onCreateLabel={(label) => persistProjectLabel(label, editorProjectId ?? selectedProjectId)}
          onCancel={(draft) => {
            if (!editor.task) {
              setNewTaskDraft(draft ? {
                projectId: selectedProjectId,
                targetProjectId: editorProjectId,
                draft,
              } : null);
            }
            setEditor(null);
          }}
          onSave={saveEditor}
        />
      )}

      {contextMenu && contextMenuTask && (
        <TaskContextMenu
          task={contextMenuTask}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          labels={availableLabels}
          onClose={closeContextMenu}
          onEdit={openTaskDetail}
          onStatusChange={(task, status) => void moveTask(task, status)}
          onPriorityChange={(task, nextPriority) => void updateTaskProperties(
            task,
            { priority: nextPriority },
          ).catch(() => {})}
          onLabelsChange={(task, labels) => void updateTaskProperties(
            task,
            { labels },
          ).catch(() => {})}
          onDuplicate={(task) => void duplicateTask(task)}
          onCopy={(text, message) => void copyText(text, message)}
          onArchive={(task) => void archiveTask(task)}
        />
      )}

      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      {undoNotice && (
        <div
          className="toast undo-toast"
          role="status"
          onAnimationEnd={() => setUndoNotice((current) => current?.id === undoNotice.id ? null : current)}
        >
          <span aria-hidden="true"><LinearIcon name="check" /></span>
          <span className="undo-toast-message">{undoNotice.message}</span>
          <button type="button" onClick={() => void performUndo()}>
            {text("撤回", "Undo")} <kbd>{undoShortcut}</kbd>
          </button>
        </div>
      )}
      {announcement && (
        <div className="toast" role="status" onAnimationEnd={() => setAnnouncementValue("")}>
          <span aria-hidden="true"><LinearIcon name="check" /></span>{announcement}
        </div>
      )}
      </div>
    </TaskboardLanguageProvider>
  );
}
