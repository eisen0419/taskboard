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

async function startServer() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "taskboard-test-"));
  const app = createTaskboardServer({ dataDirectory: directory });
  const address = await app.listen({ port: 0 });
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

async function updateTitle(baseUrl, task, title) {
  const result = await request(baseUrl, `/api/tasks/${task.id}`, {
    method: "PATCH",
    headers: AGENT_HEADERS,
    body: { version: task.version, title },
  });
  assert.equal(result.response.status, 200);
  return result.body.task;
}

async function createTitleActivities(baseUrl, task, titles) {
  let current = task;
  for (const title of titles) {
    current = await updateTitle(baseUrl, current, title);
  }
  return current;
}

async function listActivities(baseUrl, taskId, query = "") {
  return request(baseUrl, `/api/tasks/${taskId}/activities${query}`);
}

function activityTitles(result) {
  return result.body.activities.map((activity) => activity.changes[0].after);
}

test("activities: default returns all in ascending order", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "活动 0");
  await createTitleActivities(baseUrl, task, ["活动 1", "活动 2", "活动 3"]);

  const result = await listActivities(baseUrl, task.id);

  assert.equal(result.response.status, 200);
  assert.deepEqual(activityTitles(result), ["活动 1", "活动 2", "活动 3"]);
  assert.equal(result.body.hasMore, false);
});

test("activities: limit returns the newest N in ascending order", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "活动 0");
  await createTitleActivities(baseUrl, task, ["活动 1", "活动 2", "活动 3", "活动 4"]);

  const result = await listActivities(baseUrl, task.id, "?limit=2");

  assert.equal(result.response.status, 200);
  assert.deepEqual(activityTitles(result), ["活动 3", "活动 4"]);
  assert.equal(result.body.hasMore, true);
});

test("activities: limit above the total keeps hasMore false", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "活动 0");
  await createTitleActivities(baseUrl, task, ["活动 1", "活动 2"]);

  const result = await listActivities(baseUrl, task.id, "?limit=500");

  assert.equal(result.response.status, 200);
  assert.deepEqual(activityTitles(result), ["活动 1", "活动 2"]);
  assert.equal(result.body.hasMore, false);
});

test("activities: invalid limit is rejected", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "活动 0");

  for (const value of ["0", "abc", "501"]) {
    const result = await listActivities(baseUrl, task.id, `?limit=${value}`);
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error.code, "INVALID_FIELD");
    assert.equal(result.body.error.message, "'limit' must be an integer from 1 to 500");
  }
});

test("activities: unknown or repeated query parameter is rejected", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "活动 0");

  const unknown = await listActivities(baseUrl, task.id, "?foo=1");
  assert.equal(unknown.response.status, 400);
  assert.equal(unknown.body.error.code, "UNKNOWN_QUERY_PARAMETER");

  const repeated = await listActivities(baseUrl, task.id, "?limit=2&limit=3");
  assert.equal(repeated.response.status, 400);
  assert.equal(repeated.body.error.code, "INVALID_QUERY_PARAMETER");
});

test("activities: default limit is 100", async () => {
  const baseUrl = await startServer();
  const task = await createTask(baseUrl, "活动 0");
  const titles = Array.from({ length: 101 }, (_, index) => `活动 ${index + 1}`);
  await createTitleActivities(baseUrl, task, titles);

  const result = await listActivities(baseUrl, task.id);

  assert.equal(result.response.status, 200);
  assert.equal(result.body.activities.length, 100);
  assert.equal(result.body.hasMore, true);
  assert.equal(result.body.activities[0].changes[0].after, "活动 2");
  assert.equal(result.body.activities.at(-1).changes[0].after, "活动 101");
});
