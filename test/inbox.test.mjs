import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, test } from "node:test";

import { createTaskboardServer } from "../server/index.mjs";

const runningApps = [];
const AGENT_HEADERS = { "x-taskboard-client": "taskctl" };

afterEach(async () => {
  while (runningApps.length > 0) {
    const { app, directory } = runningApps.pop();
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});

async function startServer(configure, listenOptions = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "taskboard-test-"));
  const options = configure ? await configure(directory) : {};
  const app = createTaskboardServer({ dataDirectory: directory, ...options });
  const address = await app.listen({ port: 0, ...listenOptions });
  runningApps.push({ app, directory });
  return `http://127.0.0.1:${address.port}`;
}

async function request(baseUrl, pathname, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
    body: options.body === undefined || typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body),
  });
  const text = await response.text();
  return {
    response,
    body: text ? JSON.parse(text) : undefined,
  };
}

async function createTask(baseUrl, title) {
  const result = await request(baseUrl, "/api/tasks", {
    method: "POST",
    body: { title },
  });
  assert.equal(result.response.status, 201);
  return result.body.task;
}

async function createProject(baseUrl, id, name) {
  const result = await request(baseUrl, "/api/projects", {
    method: "POST",
    body: { id, name },
  });
  assert.equal(result.response.status, 201);
  return result.body.project;
}

async function createTaskIn(baseUrl, projectId, title) {
  const result = await request(baseUrl, "/api/tasks", {
    method: "POST",
    body: { projectId, title },
  });
  assert.equal(result.response.status, 201);
  return result.body.task;
}

async function agentStatus(baseUrl, task, status) {
  const result = await request(baseUrl, `/api/tasks/${task.id}`, {
    method: "PATCH",
    headers: AGENT_HEADERS,
    body: { version: task.version, status },
  });
  assert.equal(result.response.status, 200);
  return result.body.task;
}

async function agentMove(baseUrl, task, status, extra = {}) {
  const result = await request(baseUrl, `/api/tasks/${task.id}/move`, {
    method: "POST",
    headers: AGENT_HEADERS,
    body: { version: task.version, status, threadId: "thread-1", ...extra },
  });
  assert.equal(result.response.status, 200);
  return result.body.task;
}

async function userMove(baseUrl, task, status, extra = {}) {
  const result = await request(baseUrl, `/api/tasks/${task.id}/move`, {
    method: "POST",
    body: { version: task.version, status, ...extra },
  });
  assert.equal(result.response.status, 200);
  return result.body.task;
}

async function unreadInbox(baseUrl) {
  const result = await request(baseUrl, "/api/inbox");
  assert.equal(result.response.status, 200);
  return result.body;
}

test("project filter: scopes items and unreadCount", async () => {
  const baseUrl = await startServer();
  await createProject(baseUrl, "beta", "Beta");
  const localTask = await createTaskIn(baseUrl, "local", "本地待确认");
  const betaTask = await createTaskIn(baseUrl, "beta", "Beta 阻塞");
  await agentStatus(baseUrl, localTask, "in_review");
  await agentStatus(baseUrl, betaTask, "blocked");

  const local = await request(baseUrl, "/api/inbox?projectId=local");
  assert.equal(local.response.status, 200);
  assert.equal(local.body.items.length, 1);
  assert.equal(local.body.items[0].taskId, localTask.id);
  assert.equal(local.body.unreadCount, 1);

  const beta = await request(baseUrl, "/api/inbox?projectId=beta");
  assert.equal(beta.response.status, 200);
  assert.equal(beta.body.items.length, 1);
  assert.equal(beta.body.items[0].taskId, betaTask.id);
  assert.equal(beta.body.unreadCount, 1);

  const betaAll = await request(baseUrl, "/api/inbox?projectId=beta&state=all");
  assert.equal(betaAll.response.status, 200);
  assert.equal(betaAll.body.items.length, 1);
  assert.equal(betaAll.body.items[0].taskId, betaTask.id);
  assert.equal(betaAll.body.unreadCount, 1);
});

test("project filter: omitted projectId keeps the global view", async () => {
  const baseUrl = await startServer();
  await createProject(baseUrl, "beta", "Beta");
  const localTask = await createTaskIn(baseUrl, "local", "全局本地事项");
  const betaTask = await createTaskIn(baseUrl, "beta", "全局 Beta 事项");
  await agentStatus(baseUrl, localTask, "in_review");
  await agentStatus(baseUrl, betaTask, "blocked");

  const inbox = await unreadInbox(baseUrl);
  assert.deepEqual(Object.keys(inbox), ["items", "unreadCount"]);
  assert.equal(inbox.items.length, 2);
  assert.equal(inbox.unreadCount, 2);
  assert.deepEqual(new Set(inbox.items.map((item) => item.taskId)), new Set([
    localTask.id,
    betaTask.id,
  ]));
});

test("project filter: unknown project returns 404", async () => {
  const baseUrl = await startServer();

  const missing = await request(baseUrl, "/api/inbox?projectId=nope");
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error.code, "PROJECT_NOT_FOUND");

  const empty = await request(baseUrl, "/api/inbox?projectId=");
  assert.equal(empty.response.status, 400);
  assert.equal(empty.body.error.code, "INVALID_FIELD");
});

test("project filter: read-all stays global", async () => {
  const baseUrl = await startServer();
  await createProject(baseUrl, "beta", "Beta");
  const localTask = await createTaskIn(baseUrl, "local", "清空本地事项");
  const betaTask = await createTaskIn(baseUrl, "beta", "清空 Beta 事项");
  await agentStatus(baseUrl, localTask, "in_review");
  await agentStatus(baseUrl, betaTask, "blocked");

  const readAll = await request(baseUrl, "/api/inbox/read-all", { method: "POST" });
  assert.equal(readAll.response.status, 200);
  assert.deepEqual(readAll.body, { updated: 2 });

  const local = await request(baseUrl, "/api/inbox?projectId=local");
  const beta = await request(baseUrl, "/api/inbox?projectId=beta");
  assert.equal(local.body.unreadCount, 0);
  assert.equal(beta.body.unreadCount, 0);
});

test("agent in_review -> action_required", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "等待确认的事项");
  await agentStatus(baseUrl, task, "in_review");

  const inbox = await unreadInbox(baseUrl);
  assert.deepEqual(Object.keys(inbox), ["items", "unreadCount"]);
  assert.equal(inbox.unreadCount, 1);
  assert.equal(inbox.items[0].taskId, task.id);
  assert.equal(inbox.items[0].projectId, "local");
  assert.equal(inbox.items[0].taskTitle, "等待确认的事项");
  assert.equal(inbox.items[0].kind, "status_changed");
  assert.equal(inbox.items[0].severity, "action_required");
  assert.equal(inbox.items[0].summary, "Agent 把「等待确认的事项」改为 等你确认");
  assert.equal(inbox.items[0].actor.type, "agent");
  assert.equal(inbox.items[0].readAt, null);
  assert.equal(inbox.items[0].archivedAt, null);
});

test("agent blocked -> attention", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "阻塞事项");
  await agentStatus(baseUrl, task, "blocked");

  const inbox = await unreadInbox(baseUrl);
  assert.equal(inbox.items[0].severity, "attention");
  assert.equal(inbox.items[0].summary, "Agent 把「阻塞事项」改为 遇到阻碍");
});

test("agent done -> info", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "完成事项");
  await agentStatus(baseUrl, task, "done");

  const inbox = await unreadInbox(baseUrl);
  assert.equal(inbox.items[0].severity, "info");
  assert.equal(inbox.items[0].summary, "Agent 把「完成事项」改为 完成");
});

test("agent in_progress -> none", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "处理中事项");
  await agentStatus(baseUrl, task, "in_progress");

  assert.deepEqual(await unreadInbox(baseUrl), { items: [], unreadCount: 0 });
});

test("user in_review -> none", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "用户操作事项");
  const result = await request(baseUrl, `/api/tasks/${task.id}`, {
    method: "PATCH",
    body: { version: task.version, status: "in_review" },
  });
  assert.equal(result.response.status, 200);

  assert.deepEqual(await unreadInbox(baseUrl), { items: [], unreadCount: 0 });
});

test("agent comment -> attention", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "评论事项");
  const body = `${"甲".repeat(80)}不会进入摘要`;
  const result = await request(baseUrl, `/api/tasks/${task.id}/comments`, {
    method: "POST",
    headers: AGENT_HEADERS,
    body: { body },
  });
  assert.equal(result.response.status, 201);

  const inbox = await unreadInbox(baseUrl);
  assert.equal(inbox.items[0].kind, "comment_created");
  assert.equal(inbox.items[0].severity, "attention");
  assert.equal(inbox.items[0].summary, `Agent 评论「${"甲".repeat(80)}」`);
  assert.equal(inbox.items[0].actor.type, "agent");
});

test("inbox read, archive, read-all, and validation routes", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "收件箱路由");
  await agentStatus(baseUrl, task, "in_review");
  const firstInbox = await unreadInbox(baseUrl);
  const itemId = firstInbox.items[0].id;

  const unknownQuery = await request(baseUrl, "/api/inbox?foo=1");
  assert.equal(unknownQuery.response.status, 400);
  assert.equal(unknownQuery.body.error.code, "UNKNOWN_QUERY_PARAMETER");
  const invalidStateQuery = await request(baseUrl, "/api/inbox?state=archived");
  assert.equal(invalidStateQuery.response.status, 400);
  assert.equal(invalidStateQuery.body.error.code, "INVALID_FIELD");

  const read = await request(baseUrl, `/api/inbox/${itemId}`, {
    method: "PATCH",
    body: { state: "read" },
  });
  assert.equal(read.response.status, 200);
  assert.notEqual(read.body.item.readAt, null);
  assert.equal(read.body.item.archivedAt, null);
  assert.equal((await unreadInbox(baseUrl)).unreadCount, 0);
  const all = await request(baseUrl, "/api/inbox?state=all");
  assert.equal(all.body.items.length, 1);
  assert.equal(all.body.unreadCount, 0);

  const unread = await request(baseUrl, `/api/inbox/${itemId}`, {
    method: "PATCH",
    body: { state: "unread" },
  });
  assert.equal(unread.body.item.readAt, null);
  const archived = await request(baseUrl, `/api/inbox/${itemId}`, {
    method: "PATCH",
    body: { state: "archived" },
  });
  assert.notEqual(archived.body.item.readAt, null);
  assert.notEqual(archived.body.item.archivedAt, null);

  const missing = await request(baseUrl, "/api/inbox/nope", {
    method: "PATCH",
    body: { state: "read" },
  });
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error.code, "INBOX_ITEM_NOT_FOUND");
  const invalid = await request(baseUrl, `/api/inbox/${itemId}`, {
    method: "PATCH",
    body: { state: "x" },
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.error.code, "INVALID_FIELD");
  const unknownField = await request(baseUrl, `/api/inbox/${itemId}`, {
    method: "PATCH",
    body: { state: "read", extra: true },
  });
  assert.equal(unknownField.body.error.code, "UNKNOWN_FIELD");

  await request(baseUrl, `/api/tasks/${task.id}/comments`, {
    method: "POST",
    headers: AGENT_HEADERS,
    body: { body: "请处理" },
  });
  const readAll = await request(baseUrl, "/api/inbox/read-all", { method: "POST" });
  assert.equal(readAll.response.status, 200);
  assert.deepEqual(readAll.body, { updated: 1 });
  assert.equal((await unreadInbox(baseUrl)).unreadCount, 0);
});

test("inbox SSE broadcasts created and updated events", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "实时收件箱");
  const eventResponse = await fetch(`${baseUrl}/api/events`, { signal: AbortSignal.timeout(5_000) });
  const reader = eventResponse.body.getReader();
  const decoder = new TextDecoder();
  await reader.read();

  const changed = await agentStatus(baseUrl, task, "in_review");
  await request(baseUrl, `/api/tasks/${task.id}/comments`, {
    method: "POST",
    headers: AGENT_HEADERS,
    body: { body: "实时评论" },
  });
  const inbox = await unreadInbox(baseUrl);
  await request(baseUrl, `/api/inbox/${inbox.items[0].id}`, {
    method: "PATCH",
    body: { state: "read" },
  });
  const readAll = await request(baseUrl, "/api/inbox/read-all", { method: "POST" });
  assert.equal(changed.status, "in_review");
  assert.equal(readAll.body.updated, 0);

  let messages = "";
  while (
    (messages.match(/^event: inbox\.item\.created$/gm)?.length ?? 0) < 1
    || (messages.match(/^event: inbox\.updated$/gm)?.length ?? 0) < 3
  ) {
    const chunk = await reader.read();
    assert.equal(chunk.done, false);
    messages += decoder.decode(chunk.value, { stream: true });
  }
  assert.equal(messages.match(/^event: inbox\.item\.created$/gm).length, 1);
  assert.equal(messages.match(/^event: inbox\.updated$/gm).length, 3);
  await reader.cancel();
});

test("agent move in_review -> action_required", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "移动待确认事项");
  await agentMove(baseUrl, task, "in_review");

  const inbox = await unreadInbox(baseUrl);
  assert.equal(inbox.unreadCount, 1);
  assert.equal(inbox.items[0].kind, "status_changed");
  assert.equal(inbox.items[0].severity, "action_required");
  assert.equal(inbox.items[0].summary, "Agent 把「移动待确认事项」改为 等你确认");
  assert.equal(inbox.items[0].actor.type, "agent");
});

test("agent move blocked -> attention", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "移动阻塞事项");
  await agentMove(baseUrl, task, "blocked");

  const inbox = await unreadInbox(baseUrl);
  assert.equal(inbox.unreadCount, 1);
  assert.equal(inbox.items[0].severity, "attention");
  assert.equal(inbox.items[0].summary, "Agent 把「移动阻塞事项」改为 遇到阻碍");
});

test("agent move done -> info", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "移动完成事项");
  await agentMove(baseUrl, task, "done");

  const inbox = await unreadInbox(baseUrl);
  assert.equal(inbox.unreadCount, 1);
  assert.equal(inbox.items[0].severity, "info");
  assert.equal(inbox.items[0].summary, "Agent 把「移动完成事项」改为 完成");
});

test("agent move same status -> none", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "移动同状态事项");
  const inReview = await agentStatus(baseUrl, task, "in_review");
  assert.equal((await unreadInbox(baseUrl)).unreadCount, 1);

  await agentMove(baseUrl, inReview, "in_review", { sortOrder: 5_000 });
  assert.equal((await unreadInbox(baseUrl)).unreadCount, 1);
});

test("user move in_review -> none", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "用户移动事项");
  await userMove(baseUrl, task, "in_review");

  assert.equal((await unreadInbox(baseUrl)).unreadCount, 0);
});

test("inbox SSE broadcasts on move", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "移动实时收件箱");
  const eventResponse = await fetch(`${baseUrl}/api/events`, { signal: AbortSignal.timeout(5_000) });
  const reader = eventResponse.body.getReader();
  const decoder = new TextDecoder();
  await reader.read();

  await agentMove(baseUrl, task, "in_review");

  let messages = "";
  while (!messages.includes("event: inbox.item.created")) {
    const chunk = await reader.read();
    assert.equal(chunk.done, false);
    messages += decoder.decode(chunk.value, { stream: true });
  }
  const inboxMessage = messages
    .split("\n\n")
    .find((message) => message.startsWith("event: inbox.item.created\n"));
  const dataLine = inboxMessage.split("\n").find((line) => line.startsWith("data: "));
  const event = JSON.parse(dataLine.slice(6));
  assert.equal(event.type, "inbox.item.created");
  assert.ok(event.item);
  assert.equal(event.taskId, task.id);
  assert.equal(event.projectId, "local");
  await reader.cancel();
});

test("fold: same task updates the existing unread item", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "折叠同一议题");
  await agentStatus(baseUrl, task, "in_review");
  const firstInbox = await unreadInbox(baseUrl);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const comment = await request(baseUrl, `/api/tasks/${task.id}/comments`, {
    method: "POST",
    headers: AGENT_HEADERS,
    body: { body: "请查看最新进展" },
  });
  assert.equal(comment.response.status, 201);

  const foldedInbox = await unreadInbox(baseUrl);
  assert.equal(foldedInbox.unreadCount, 1);
  assert.equal(foldedInbox.items[0].id, firstInbox.items[0].id);
  assert.equal(foldedInbox.items[0].collapsedCount, 2);
  assert.equal(foldedInbox.items[0].kind, "comment_created");
  assert.match(foldedInbox.items[0].summary, /^Agent 评论/);
  assert.ok(foldedInbox.items[0].createdAt > firstInbox.items[0].createdAt);
});

test("fold: severity keeps the highest", async () => {
  const baseUrl = await startServer();
  const highSeverityTask = await createTask(baseUrl, "高优先级保留");
  await agentStatus(baseUrl, highSeverityTask, "in_review");
  const comment = await request(baseUrl, `/api/tasks/${highSeverityTask.id}/comments`, {
    method: "POST",
    headers: AGENT_HEADERS,
    body: { body: "补充说明" },
  });
  assert.equal(comment.response.status, 201);

  const promotedTask = await createTask(baseUrl, "优先级提升");
  const doneTask = await agentStatus(baseUrl, promotedTask, "done");
  await agentStatus(baseUrl, doneTask, "in_review");

  const inbox = await unreadInbox(baseUrl);
  assert.equal(
    inbox.items.find((item) => item.taskId === highSeverityTask.id).severity,
    "action_required",
  );
  assert.equal(
    inbox.items.find((item) => item.taskId === promotedTask.id).severity,
    "action_required",
  );
});

test("fold: read items are not folded into", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "已读后新建");
  await agentStatus(baseUrl, task, "in_review");
  await request(baseUrl, `/api/tasks/${task.id}/comments`, {
    method: "POST",
    headers: AGENT_HEADERS,
    body: { body: "首次折叠" },
  });
  const foldedItem = (await unreadInbox(baseUrl)).items[0];
  assert.equal(foldedItem.collapsedCount, 2);

  const read = await request(baseUrl, `/api/inbox/${foldedItem.id}`, {
    method: "PATCH",
    body: { state: "read" },
  });
  assert.equal(read.response.status, 200);
  const comment = await request(baseUrl, `/api/tasks/${task.id}/comments`, {
    method: "POST",
    headers: AGENT_HEADERS,
    body: { body: "已读后的新评论" },
  });
  assert.equal(comment.response.status, 201);

  const unread = await unreadInbox(baseUrl);
  assert.equal(unread.unreadCount, 1);
  assert.notEqual(unread.items[0].id, foldedItem.id);
  assert.equal(unread.items[0].collapsedCount, 1);
  const all = await request(baseUrl, "/api/inbox?state=all");
  assert.equal(all.response.status, 200);
  assert.equal(all.body.items.length, 2);
});

test("fold: different tasks do not fold", async () => {
  const baseUrl = await startServer();
  const firstTask = await createTask(baseUrl, "独立议题一");
  const secondTask = await createTask(baseUrl, "独立议题二");
  await agentStatus(baseUrl, firstTask, "in_review");
  await agentStatus(baseUrl, secondTask, "in_review");

  const inbox = await unreadInbox(baseUrl);
  assert.equal(inbox.unreadCount, 2);
  assert.deepEqual(new Set(inbox.items.map((item) => item.taskId)), new Set([
    firstTask.id,
    secondTask.id,
  ]));
  assert.ok(inbox.items.every((item) => item.collapsedCount === 1));
});

test("fold: SSE emits inbox.updated", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "折叠实时事件");
  const eventResponse = await fetch(`${baseUrl}/api/events`, { signal: AbortSignal.timeout(5_000) });
  const reader = eventResponse.body.getReader();
  const decoder = new TextDecoder();
  await reader.read();

  await agentStatus(baseUrl, task, "in_review");
  const comment = await request(baseUrl, `/api/tasks/${task.id}/comments`, {
    method: "POST",
    headers: AGENT_HEADERS,
    body: { body: "触发折叠事件" },
  });
  assert.equal(comment.response.status, 201);

  let messages = "";
  while (
    !messages.includes("event: inbox.item.created")
    || !messages.includes("event: inbox.updated")
  ) {
    const chunk = await reader.read();
    assert.equal(chunk.done, false);
    messages += decoder.decode(chunk.value, { stream: true });
  }
  const inboxMessages = messages
    .split("\n\n")
    .filter((message) => message.startsWith("event: inbox."));
  assert.equal(inboxMessages.length, 2);
  assert.ok(inboxMessages[0].startsWith("event: inbox.item.created\n"));
  assert.ok(inboxMessages[1].startsWith("event: inbox.updated\n"));
  const dataLine = inboxMessages[1].split("\n").find((line) => line.startsWith("data: "));
  const event = JSON.parse(dataLine.slice(6));
  assert.equal(event.item.collapsedCount, 2);
  assert.equal(event.taskId, task.id);
  await reader.cancel();
});

test("fold: existing inbox_items table gains collapsed_count", async () => {
  let databasePath;
  const baseUrl = await startServer((directory) => {
    databasePath = path.join(directory, "taskboard.sqlite");
    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE IF NOT EXISTS inbox_items (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('status_changed', 'comment_created')),
        severity TEXT NOT NULL CHECK (severity IN ('action_required', 'attention', 'info')),
        summary TEXT NOT NULL,
        actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent')),
        actor_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        actor_avatar_url TEXT,
        source_id TEXT,
        created_at TEXT NOT NULL,
        read_at TEXT,
        archived_at TEXT
      );

      CREATE INDEX IF NOT EXISTS inbox_items_state_created
        ON inbox_items(read_at, archived_at, created_at);

      CREATE INDEX IF NOT EXISTS inbox_items_task
        ON inbox_items(task_id);
    `);
    database.close();
    return {};
  });

  const database = new DatabaseSync(databasePath);
  const columns = database.prepare("PRAGMA table_info(inbox_items)").all();
  database.close();
  assert.ok(columns.some((column) => column.name === "collapsed_count"));
  const inbox = await request(baseUrl, "/api/inbox");
  assert.equal(inbox.response.status, 200);
});
