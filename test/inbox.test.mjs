import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

async function agentStatus(baseUrl, task, status) {
  const result = await request(baseUrl, `/api/tasks/${task.id}`, {
    method: "PATCH",
    headers: AGENT_HEADERS,
    body: { version: task.version, status },
  });
  assert.equal(result.response.status, 200);
  return result.body.task;
}

async function unreadInbox(baseUrl) {
  const result = await request(baseUrl, "/api/inbox");
  assert.equal(result.response.status, 200);
  return result.body;
}

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
  assert.equal(readAll.body.updated, 1);

  let messages = "";
  while (
    (messages.match(/^event: inbox\.item\.created$/gm)?.length ?? 0) < 2
    || (messages.match(/^event: inbox\.updated$/gm)?.length ?? 0) < 2
  ) {
    const chunk = await reader.read();
    assert.equal(chunk.done, false);
    messages += decoder.decode(chunk.value, { stream: true });
  }
  assert.equal(messages.match(/^event: inbox\.item\.created$/gm).length, 2);
  assert.equal(messages.match(/^event: inbox\.updated$/gm).length, 2);
  await reader.cancel();
});
