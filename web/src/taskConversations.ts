import type { AgentThreadBinding, Task } from "./types";

export interface TaskConversationItem {
  key: string;
  projectId: string;
  kind: "native";
  title: string;
  source: "task" | "comment";
  nativeThreadId: string;
  threadBinding: AgentThreadBinding | null;
  legacyLocalThreadId: string | null;
  updatedAt: string;
}

export interface TaskProcessingPresentation {
  running: boolean;
  completed: number | null;
  total: number | null;
  startedAt: string | null;
}

export interface TaskCardPresentation {
  conversations: TaskConversationItem[];
  processing: TaskProcessingPresentation;
  unread: boolean;
}

function normalizeThreadId(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.replace(/^(?:local|cloud):/i, "").trim();
}

export function taskConversations(task: Task) {
  const items = new Map<string, TaskConversationItem>();

  for (const ref of task.conversationRefs ?? []) {
    const normalizedId = normalizeThreadId(ref.threadId);
    if (!normalizedId) continue;
    const key = `agent:${normalizedId}`;
    const current = items.get(key);
    const next: TaskConversationItem = {
      key,
      projectId: task.projectId,
      kind: "native",
      title: ref.title || task.title,
      source: ref.source,
      nativeThreadId: ref.threadId,
      threadBinding: ref.legacyLocal ? null : {
        threadId: ref.threadId,
        agentProjectId: ref.agentProjectId,
        agentProjectKind: ref.agentProjectKind,
        agentHostId: ref.agentHostId,
        workspacePath: ref.workspacePath,
      },
      legacyLocalThreadId: ref.legacyLocal ? ref.threadId : null,
      updatedAt: ref.updatedAt,
    };
    if (!current || next.updatedAt >= current.updatedAt) items.set(key, next);
  }

  return [...items.values()].sort((left, right) => (
    right.updatedAt.localeCompare(left.updatedAt) || left.key.localeCompare(right.key)
  ));
}

export function taskCardPresentation(task: Task, unread: boolean): TaskCardPresentation {
  return {
    conversations: taskConversations(task),
    unread,
    // Keep the view presentation shape stable without run tracking.
    processing: {
      running: false,
      completed: null,
      total: null,
      startedAt: null,
    },
  };
}
