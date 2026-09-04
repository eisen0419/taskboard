import { createHmac, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  DEFAULT_PROJECT_ID,
  TASK_STATUSES,
  isTaskPriority,
  isTaskStatus,
} from "../shared/domain.mjs";
import { ApiError, TaskboardDatabase } from "./database.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const JSON_BODY_LIMIT = 1024 * 1024;
const PROJECT_README_BODY_LIMIT = 3 * 1024 * 1024;
const ATTACHMENT_BODY_LIMIT = 25 * 1024 * 1024;
const INLINE_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);
const PROJECT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const PROJECT_BOARD_DISPLAY_SETTINGS_KEY_PREFIX = "taskboard.project-board-display-settings.v3.";
const TRUSTED_EMBED_ORIGINS = new Set(["app://-"]);
const TRUSTED_ORIGINS_ENV = "TASKBOARD_TRUSTED_ORIGINS";
const AGENT_ACTOR = {
  type: "agent",
  id: "agent",
  name: "Agent",
  avatarUrl: null,
};
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function sendJson(response, status, value, headers = {}) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(body);
}

function sendEmpty(response, status, headers = {}) {
  response.writeHead(status, { "cache-control": "no-store", ...headers });
  response.end();
}

function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function isTrustedNetworkHost(hostname) {
  const host = normalizeHostname(hostname);
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  if (isIP(host) === 4) {
    const octets = host.split(".").map(Number);
    return octets[0] === 127
      || octets[0] === 10
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      || (octets[0] === 192 && octets[1] === 168)
      || (octets[0] === 169 && octets[1] === 254);
  }
  if (isIP(host) === 6) {
    return host.startsWith("fc")
      || host.startsWith("fd")
      || /^fe[89ab]/.test(host);
  }
  return false;
}

function parseTrustedOrigins(value) {
  if (value === undefined) return new Set();
  const configured = String(value).trim();
  if (!configured) {
    throw new Error(`${TRUSTED_ORIGINS_ENV} must not be empty when configured`);
  }

  const origins = new Set();
  for (const rawOrigin of configured.split(",")) {
    const origin = rawOrigin.trim();
    if (!origin || origin.includes("*")) {
      throw new Error(`${TRUSTED_ORIGINS_ENV} must be a comma-separated list of exact HTTPS origins`);
    }
    let url;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`${TRUSTED_ORIGINS_ENV} must contain valid HTTPS origins`);
    }
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) {
      throw new Error(`${TRUSTED_ORIGINS_ENV} must contain exact HTTPS origins without paths, queries, fragments, or credentials`);
    }
    if (origins.has(url.origin)) {
      throw new Error(`${TRUSTED_ORIGINS_ENV} must not contain duplicate origins`);
    }
    origins.add(url.origin);
  }
  return origins;
}

function parseRequestHost(value) {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    throw new ApiError(403, "INVALID_HOST", "Request Host must be local, private, or explicitly trusted");
  }
  let url;
  try {
    url = new URL(`https://${value}`);
  } catch {
    throw new ApiError(403, "INVALID_HOST", "Request Host must be local, private, or explicitly trusted");
  }
  if (
    url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
    || !url.hostname
  ) {
    throw new ApiError(403, "INVALID_HOST", "Request Host must be local, private, or explicitly trusted");
  }
  return { hostname: url.hostname, httpsOrigin: url.origin };
}

function assertTrustedNetworkRequest(request, allowOpaqueOrigin = false, trustedOrigins = new Set()) {
  const host = parseRequestHost(request.headers.host);
  const trustedNetworkHost = isTrustedNetworkHost(host.hostname);
  const configuredTrustedHost = !trustedNetworkHost && trustedOrigins.has(host.httpsOrigin);
  if (!trustedNetworkHost && !configuredTrustedHost) {
    throw new ApiError(403, "INVALID_HOST", "Request Host must be local, private, or explicitly trusted");
  }

  const origin = request.headers.origin;
  const configuredTrustedOrigin = trustedOrigins.has(origin);
  if (origin && !configuredTrustedOrigin && !TRUSTED_EMBED_ORIGINS.has(origin)) {
    if (!(allowOpaqueOrigin && origin === "null")) {
      let originHost;
      try {
        originHost = new URL(origin).hostname;
      } catch {
        throw new ApiError(403, "INVALID_ORIGIN", "Request Origin must be local or private");
      }
      if (!isTrustedNetworkHost(originHost)) {
        throw new ApiError(403, "INVALID_ORIGIN", "Request Origin must be local or private");
      }
    }
  }
  return configuredTrustedHost || configuredTrustedOrigin;
}

function assertPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_BODY", "Request body must be a JSON object");
  }
}

function assertAllowedKeys(value, allowed) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new ApiError(400, "UNKNOWN_FIELD", `Unknown field${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`);
  }
}

function assertAllowedQuery(searchParams, allowed, routeLabel) {
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", `${routeLabel} does not accept query parameter '${key}'`);
    }
    if (searchParams.getAll(key).length !== 1) {
      throw new ApiError(400, "INVALID_QUERY_PARAMETER", `Query parameter '${key}' cannot be repeated`);
    }
  }
}

function parseAfterCursor(searchParams, routeLabel) {
  assertAllowedQuery(searchParams, new Set(["after"]), routeLabel);
  const value = searchParams.get("after");
  if (value === null) return null;
  const revision = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(revision)) {
    throw new ApiError(400, "INVALID_CURSOR", "Cursor must be a non-negative integer revision");
  }
  return { value, revision };
}

function nextCursor(items, after) {
  if (items.length === 0) return after?.value ?? "0";
  return String(items.reduce(
    (revision, item) => Math.max(revision, item.changeRevision),
    0,
  ));
}

function stringField(value, name, { required = false, nullable = false, maxLength }) {
  if (value === undefined) {
    if (required) {
      throw new ApiError(400, "INVALID_FIELD", `'${name}' is required`);
    }
    return undefined;
  }
  if (nullable && value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_FIELD", `'${name}' must be a string${nullable ? " or null" : ""}`);
  }
  const normalized = value.trim();
  if (required && normalized.length === 0) {
    throw new ApiError(400, "INVALID_FIELD", `'${name}' cannot be empty`);
  }
  if (normalized.length > maxLength) {
    throw new ApiError(400, "INVALID_FIELD", `'${name}' cannot exceed ${maxLength} characters`);
  }
  return normalized;
}

function parseDueDate(value, name = "dueDate") {
  const date = stringField(value, name, { nullable: true, maxLength: 10 });
  if (date !== null && date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(400, "INVALID_FIELD", `'${name}' must use YYYY-MM-DD`);
  }
  return date;
}

function parseDevelopmentContext(value) {
  if (value === null) return null;
  assertPlainObject(value);
  if (value.type === "branch") {
    assertAllowedKeys(value, new Set(["type", "branch"]));
    return {
      type: "branch",
      branch: stringField(value.branch, "developmentContext.branch", { required: true, maxLength: 512 }),
    };
  }
  if (value.type === "worktree") {
    assertAllowedKeys(value, new Set(["type", "path", "branch"]));
    const worktreePath = stringField(value.path, "developmentContext.path", { required: true, maxLength: 4096 });
    if (worktreePath.includes("\0")) {
      throw new ApiError(400, "INVALID_FIELD", "'developmentContext.path' cannot contain null bytes");
    }
    return {
      type: "worktree",
      path: worktreePath,
      branch: stringField(value.branch ?? null, "developmentContext.branch", { nullable: true, maxLength: 512 }),
    };
  }
  throw new ApiError(400, "INVALID_FIELD", "'developmentContext.type' must be branch or worktree");
}

function parseRecurrence(value) {
  if (value === null) return null;
  assertPlainObject(value);
  assertAllowedKeys(value, new Set(["interval", "unit"]));
  if (!Number.isSafeInteger(value.interval) || value.interval < 1 || value.interval > 365) {
    throw new ApiError(400, "INVALID_FIELD", "'recurrence.interval' must be an integer from 1 to 365");
  }
  if (!["day", "week", "month", "year"].includes(value.unit)) {
    throw new ApiError(400, "INVALID_FIELD", "'recurrence.unit' must be day, week, month, or year");
  }
  return { interval: value.interval, unit: value.unit };
}

function parseVersion(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ApiError(400, "INVALID_FIELD", "'version' must be a positive integer");
  }
  return value;
}

function parseSortOrder(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1_000_000_000_000) {
    throw new ApiError(400, "INVALID_FIELD", "'sortOrder' must be a finite number between -1000000000000 and 1000000000000");
  }
  return value;
}

function parseLabels(value) {
  if (!Array.isArray(value) || value.length > 20) {
    throw new ApiError(400, "INVALID_FIELD", "'labels' must be an array with at most 20 entries");
  }
  const labels = value.map((label) => {
    if (typeof label !== "string") {
      throw new ApiError(400, "INVALID_FIELD", "Every label must be a string");
    }
    const normalized = label.trim();
    if (normalized.length === 0 || normalized.length > 64) {
      throw new ApiError(400, "INVALID_FIELD", "Labels must contain 1 to 64 characters");
    }
    return normalized;
  });
  if (new Set(labels).size !== labels.length) {
    throw new ApiError(400, "INVALID_FIELD", "Labels must be unique");
  }
  return labels;
}

function parseStatus(value, fallback) {
  const result = value ?? fallback;
  if (!isTaskStatus(result)) {
    throw new ApiError(400, "INVALID_FIELD", `'status' must be one of: ${TASK_STATUSES.join(", ")}`);
  }
  return result;
}

function parsePriority(value, fallback) {
  const result = value ?? fallback;
  if (!isTaskPriority(result)) {
    throw new ApiError(400, "INVALID_FIELD", "'priority' must be none, urgent, high, medium, or low");
  }
  return result;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function validateProjectId(value, { required = true } = {}) {
  const id = stringField(value, "id", { required, maxLength: 64 });
  if (id !== undefined && !PROJECT_ID_PATTERN.test(id)) {
    throw new ApiError(400, "INVALID_FIELD", "'id' must be a lowercase slug containing letters, numbers, or hyphens");
  }
  return id;
}

function parseProjectCreate(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set(["id", "name", "workspacePath"]));
  const name = stringField(body.name, "name", { required: true, maxLength: 120 });
  const id = validateProjectId(body.id ?? slugify(name));
  if (!id) {
    throw new ApiError(400, "INVALID_FIELD", "Project name must contain at least one letter or number when 'id' is omitted");
  }
  const workspacePath = stringField(body.workspacePath ?? null, "workspacePath", { nullable: true, maxLength: 4096 });
  if (workspacePath === "") {
    throw new ApiError(400, "INVALID_FIELD", "'workspacePath' cannot be empty");
  }
  if (workspacePath?.includes("\0")) {
    throw new ApiError(400, "INVALID_FIELD", "'workspacePath' cannot contain null bytes");
  }
  return { id, name, workspacePath };
}

function parseProjectLabel(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set(["label"]));
  return stringField(body.label, "label", { required: true, maxLength: 64 });
}

function parseProjectReadmeSave(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set(["content", "version"]));
  const content = body.content ?? "";
  if (typeof content !== "string") {
    throw new ApiError(400, "INVALID_FIELD", "'content' must be a string");
  }
  if (content.length > 500_000) {
    throw new ApiError(400, "INVALID_FIELD", "'content' cannot exceed 500000 characters");
  }
  const version = body.version;
  if (version !== undefined && (!Number.isSafeInteger(version) || version < 0)) {
    throw new ApiError(400, "INVALID_FIELD", "'version' must be a non-negative integer");
  }
  return { content, version };
}

function parseThreadId(value) {
  if (value === undefined) return undefined;
  return stringField(value, "threadId", { required: true, maxLength: 256 });
}

function parseThreadBinding(value) {
  if (value === undefined || value === null) return value;
  assertPlainObject(value);
  assertAllowedKeys(value, new Set([
    "threadId",
    "agentProjectId",
    "agentProjectKind",
    "agentHostId",
    "workspacePath",
  ]));
  const threadId = stringField(value.threadId, "threadBinding.threadId", {
    required: true,
    maxLength: 256,
  });
  const identityFields = [
    value.agentProjectId,
    value.agentProjectKind,
    value.agentHostId,
    value.workspacePath,
  ];
  if (identityFields.every((field) => field === undefined)) return { threadId };
  if (identityFields.some((field) => field === undefined)) {
    throw new ApiError(400, "INVALID_FIELD", "Thread identity must include project, kind, host, and workspace");
  }
  const agentProjectId = stringField(value.agentProjectId, "threadBinding.agentProjectId", {
    required: true,
    maxLength: 256,
  });
  const agentProjectKind = value.agentProjectKind;
  const agentHostId = stringField(value.agentHostId, "threadBinding.agentHostId", {
    required: true,
    maxLength: 256,
  });
  const workspacePath = stringField(value.workspacePath, "threadBinding.workspacePath", {
    required: true,
    maxLength: 4096,
  });
  if (agentProjectKind !== "local" && agentProjectKind !== "remote") {
    throw new ApiError(400, "INVALID_FIELD", "threadBinding.agentProjectKind must be local or remote");
  }
  if (
    (agentProjectKind === "local" && agentHostId !== "local")
    || (agentProjectKind === "remote" && agentHostId === "local")
    || workspacePath.includes("\0")
  ) {
    throw new ApiError(400, "INVALID_FIELD", "Thread project identity is invalid");
  }
  return { threadId, agentProjectId, agentProjectKind, agentHostId, workspacePath };
}

function requestHeader(request, name) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function actorFromRequest(request) {
  if (request.headers["x-taskboard-client"] === "taskctl") {
    return AGENT_ACTOR;
  }

  const rawId = requestHeader(request, "x-taskboard-user-id");
  const rawName = requestHeader(request, "x-taskboard-user-name");
  const rawAvatarUrl = requestHeader(request, "x-taskboard-user-avatar");
  if (rawId === undefined && rawName === undefined && rawAvatarUrl === undefined) {
    return { type: "user", id: "local-user", name: "本地用户", avatarUrl: null };
  }
  if (rawId === undefined || rawName === undefined) {
    throw new ApiError(400, "INVALID_ACTOR", "User identity requires both an ID and name");
  }

  const id = stringField(rawId, "X-Taskboard-User-Id", { required: true, maxLength: 96 });
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(id)) {
    throw new ApiError(400, "INVALID_ACTOR", "User ID contains unsupported characters");
  }
  let decodedName;
  try {
    decodedName = decodeURIComponent(rawName);
  } catch {
    throw new ApiError(400, "INVALID_ACTOR", "User name is not valid URL-encoded text");
  }
  const name = stringField(decodedName, "X-Taskboard-User-Name", { required: true, maxLength: 120 });

  let avatarUrl = null;
  if (rawAvatarUrl !== undefined) {
    const value = stringField(rawAvatarUrl, "X-Taskboard-User-Avatar", { required: true, maxLength: 2048 });
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new ApiError(400, "INVALID_ACTOR", "User avatar URL is invalid");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new ApiError(400, "INVALID_ACTOR", "User avatar URL must use HTTP or HTTPS");
    }
    avatarUrl = parsed.toString();
  }
  return { type: "user", id, name, avatarUrl };
}

function parseAssigneeTarget(value) {
  if (value === undefined) return undefined;
  if (value !== "current-user" && value !== "agent") {
    throw new ApiError(400, "INVALID_FIELD", "'assigneeTarget' must be current-user or agent");
  }
  return value;
}

function resolveAssignee(target, actor) {
  if (target === undefined) return actor;
  if (target === "agent") return AGENT_ACTOR;
  if (actor.type !== "user") {
    throw new ApiError(400, "INVALID_FIELD", "'current-user' requires a user request identity");
  }
  return actor;
}

function parseTaskCreate(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set([
    "projectId", "title", "description", "status", "priority", "labels", "sortOrder", "threadId", "threadBinding",
    "assigneeTarget", "developmentContext", "startDate", "dueDate", "recurrence",
  ]));
  const projectId = validateProjectId(body.projectId ?? DEFAULT_PROJECT_ID);
  const task = {
    projectId,
    title: stringField(body.title, "title", { required: true, maxLength: 240 }),
    description: stringField(body.description ?? "", "description", { maxLength: 100_000 }),
    status: parseStatus(body.status, "backlog"),
    priority: parsePriority(body.priority, "none"),
    labels: body.labels === undefined ? [] : parseLabels(body.labels),
    sortOrder: body.sortOrder === undefined ? undefined : parseSortOrder(body.sortOrder),
    threadId: parseThreadId(body.threadId),
    threadBinding: parseThreadBinding(body.threadBinding),
    assigneeTarget: parseAssigneeTarget(body.assigneeTarget),
    developmentContext: parseDevelopmentContext(body.developmentContext ?? null),
    startDate: parseDueDate(body.startDate ?? null, "startDate"),
    dueDate: parseDueDate(body.dueDate ?? null),
    recurrence: parseRecurrence(body.recurrence ?? null),
  };
  if (task.recurrence && !task.dueDate) {
    throw new ApiError(400, "INVALID_FIELD", "A recurring issue requires 'dueDate'");
  }
  return task;
}

function parseTaskPatch(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set([
    "version", "projectId", "title", "description", "status", "priority", "labels", "threadId", "threadBinding",
    "assigneeTarget", "developmentContext", "startDate", "dueDate", "recurrence",
  ]));
  const version = parseVersion(body.version);
  const threadId = parseThreadId(body.threadId);
  const threadBinding = parseThreadBinding(body.threadBinding);
  const assigneeTarget = parseAssigneeTarget(body.assigneeTarget);
  const changes = {};
  if (body.projectId !== undefined) changes.projectId = validateProjectId(body.projectId);
  if (body.title !== undefined) changes.title = stringField(body.title, "title", { required: true, maxLength: 240 });
  if (body.description !== undefined) changes.description = stringField(body.description, "description", { maxLength: 100_000 });
  if (body.status !== undefined) changes.status = parseStatus(body.status);
  if (body.priority !== undefined) changes.priority = parsePriority(body.priority);
  if (body.labels !== undefined) changes.labels = parseLabels(body.labels);
  if (body.developmentContext !== undefined) changes.developmentContext = parseDevelopmentContext(body.developmentContext);
  if (body.startDate !== undefined) changes.startDate = parseDueDate(body.startDate, "startDate");
  if (body.dueDate !== undefined) changes.dueDate = parseDueDate(body.dueDate);
  if (body.recurrence !== undefined) changes.recurrence = parseRecurrence(body.recurrence);
  if (changes.recurrence && body.dueDate === null) {
    throw new ApiError(400, "INVALID_FIELD", "A recurring issue requires 'dueDate'");
  }
  if (Object.keys(changes).length === 0 && assigneeTarget === undefined) {
    throw new ApiError(400, "INVALID_BODY", "PATCH requires at least one task field");
  }
  return { version, changes, threadId, threadBinding, assigneeTarget };
}

function parseMove(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set(["version", "status", "sortOrder", "threadId", "threadBinding"]));
  return {
    version: parseVersion(body.version),
    status: parseStatus(body.status),
    sortOrder: body.sortOrder === undefined ? undefined : parseSortOrder(body.sortOrder),
    threadId: parseThreadId(body.threadId),
    threadBinding: parseThreadBinding(body.threadBinding),
  };
}

function parseArchive(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set(["version", "threadId", "threadBinding"]));
  return {
    version: parseVersion(body.version),
    threadId: parseThreadId(body.threadId),
    threadBinding: parseThreadBinding(body.threadBinding),
  };
}

function parseRelationOrigin(value) {
  if (value === undefined) return undefined;
  if (value !== "manual" && value !== "mention") {
    throw new ApiError(400, "INVALID_FIELD", "'origin' must be manual or mention");
  }
  return value;
}

function parseRelationMutation(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set(["version", "threadId", "threadBinding", "origin"]));
  return {
    version: parseVersion(body.version),
    threadId: parseThreadId(body.threadId),
    threadBinding: parseThreadBinding(body.threadBinding),
    origin: parseRelationOrigin(body.origin),
  };
}

function parseIssueRelationType(value) {
  if (!["parent", "blocks", "blocked_by", "related"].includes(value)) {
    throw new ApiError(
      400,
      "INVALID_FIELD",
      "'relation type' must be parent, blocks, blocked_by, or related",
    );
  }
  return value;
}

function parseCommentCreate(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set(["body", "threadId", "threadBinding"]));
  return {
    body: stringField(body.body ?? "", "body", { maxLength: 100_000 }),
    threadId: parseThreadId(body.threadId),
    threadBinding: parseThreadBinding(body.threadBinding),
  };
}

function parseCommentPatch(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, new Set(["version", "body", "threadId", "threadBinding"]));
  if (body.body === undefined) {
    throw new ApiError(400, "INVALID_FIELD", "'body' is required");
  }
  return {
    version: parseVersion(body.version),
    body: stringField(body.body, "body", { maxLength: 100_000 }),
    threadId: parseThreadId(body.threadId),
    threadBinding: parseThreadBinding(body.threadBinding),
  };
}

function parseAttachmentHeaders(request) {
  const encodedFilename = request.headers["x-taskboard-filename"];
  if (typeof encodedFilename !== "string") {
    throw new ApiError(400, "INVALID_FILENAME", "X-Taskboard-Filename is required");
  }
  let filename;
  try {
    filename = decodeURIComponent(encodedFilename).trim();
  } catch {
    throw new ApiError(400, "INVALID_FILENAME", "Attachment filename contains invalid encoding");
  }
  if (
    filename.length === 0
    || filename.length > 240
    || filename === "."
    || filename === ".."
    || /[\u0000-\u001f\u007f/\\]/.test(filename)
  ) {
    throw new ApiError(400, "INVALID_FILENAME", "Attachment filename is invalid");
  }

  const rawContentType = request.headers["content-type"];
  const contentType = typeof rawContentType === "string"
    ? rawContentType.split(";", 1)[0].trim().toLowerCase()
    : "application/octet-stream";
  if (contentType.length === 0 || contentType.length > 200 || !/^[!#$%&'*+.^_`|~0-9a-z-]+\/[!#$%&'*+.^_`|~0-9a-z-]+$/.test(contentType)) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Attachment Content-Type is invalid");
  }
  const kind = request.headers["x-taskboard-attachment-kind"];
  if (kind !== "inline" && kind !== "attachment") {
    throw new ApiError(
      400,
      "INVALID_ATTACHMENT_KIND",
      "X-Taskboard-Attachment-Kind must be inline or attachment",
    );
  }
  return { filename, contentType, kind };
}

async function readBody(request, limit, tooLargeMessage) {
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new ApiError(413, "BODY_TOO_LARGE", tooLargeMessage);
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) {
      throw new ApiError(413, "BODY_TOO_LARGE", tooLargeMessage);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(
  request,
  limit = JSON_BODY_LIMIT,
  tooLargeMessage = "Request body cannot exceed 1 MiB",
) {
  const contentType = request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
  }
  const body = await readBody(request, limit, tooLargeMessage);
  const length = body.length;
  if (length === 0) {
    throw new ApiError(400, "INVALID_JSON", "Request body cannot be empty");
  }
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must contain valid JSON");
  }
}

async function assertEmptyRequestBody(request, routeLabel) {
  const body = await readBody(request, JSON_BODY_LIMIT, "Request body cannot exceed 1 MiB");
  if (body.length > 0) {
    throw new ApiError(400, "INVALID_BODY", `${routeLabel} does not accept a request body`);
  }
}

function parseTaskFilters(searchParams) {
  const allowed = new Set(["projectId", "status", "archived"]);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", `Unknown query parameter '${key}'`);
    }
    if (searchParams.getAll(key).length !== 1) {
      throw new ApiError(400, "INVALID_QUERY_PARAMETER", `Query parameter '${key}' cannot be repeated`);
    }
  }

  const projectIdValue = searchParams.get("projectId");
  const statusValue = searchParams.get("status");
  const archived = searchParams.get("archived") ?? "false";
  if (statusValue !== null && !isTaskStatus(statusValue)) {
    throw new ApiError(400, "INVALID_QUERY_PARAMETER", "Invalid task status");
  }
  if (!new Set(["true", "false", "all"]).has(archived)) {
    throw new ApiError(400, "INVALID_QUERY_PARAMETER", "'archived' must be true, false, or all");
  }
  const projectId = projectIdValue === null ? undefined : validateProjectId(projectIdValue);
  return { projectId, status: statusValue ?? undefined, archived };
}

function parseTaskTreeQuery(searchParams) {
  const allowed = new Set(["direction", "depth"]);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", `Unknown query parameter '${key}'`);
    }
    if (searchParams.getAll(key).length !== 1) {
      throw new ApiError(400, "INVALID_TREE_QUERY", `Query parameter '${key}' cannot be repeated`);
    }
  }
  const direction = searchParams.get("direction");
  if (direction !== "descendants" && direction !== "ancestors") {
    throw new ApiError(400, "INVALID_TREE_QUERY", "'direction' must be descendants or ancestors");
  }
  const rawDepth = searchParams.get("depth");
  const depth = Number(rawDepth);
  if (!/^\d+$/.test(rawDepth ?? "") || !Number.isSafeInteger(depth) || depth < 1 || depth > 25) {
    throw new ApiError(400, "INVALID_TREE_QUERY", "'depth' must be an integer from 1 to 25");
  }
  return { direction, depth };
}

class EventHub {
  constructor() {
    this.clients = new Set();
    this.keepAlive = setInterval(() => {
      for (const response of this.clients) response.write(": keep-alive\n\n");
    }, 20_000);
    this.keepAlive.unref();
  }

  connect(request, response) {
    response.writeHead(200, {
      connection: "keep-alive",
      "cache-control": "no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    });
    response.write(": connected\n\n");
    this.clients.add(response);
    request.once("close", () => this.clients.delete(response));
  }

  emit(type, value) {
    const event = {
      type,
      projectId: value.projectId ?? value.project?.id ?? value.task?.projectId,
      taskId: value.task?.id ?? value.comment?.taskId ?? value.attachment?.taskId,
      ...value,
      at: new Date().toISOString(),
    };
    const message = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const response of this.clients) response.write(message);
  }

  close() {
    clearInterval(this.keepAlive);
    for (const response of this.clients) response.end();
    this.clients.clear();
  }
}

async function serveStatic(request, response, pathname, staticDirectory) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new ApiError(400, "INVALID_PATH", "URL path contains invalid encoding");
  }
  if (decodedPath.includes("\0")) {
    throw new ApiError(400, "INVALID_PATH", "URL path is invalid");
  }

  const root = path.resolve(staticDirectory);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  let filename = path.resolve(root, relativePath);
  if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) {
    throw new ApiError(400, "INVALID_PATH", "URL path is outside the static directory");
  }

  let fileStats;
  try {
    fileStats = await stat(filename);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!fileStats?.isFile() && !path.extname(relativePath)) {
    filename = path.join(root, "index.html");
    try {
      fileStats = await stat(filename);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  if (!fileStats?.isFile()) return false;

  const body = await readFile(filename);
  const headers = {
    "cache-control": path.basename(filename) === "index.html" ? "no-cache" : "public, max-age=31536000, immutable",
    "content-length": body.length,
    "content-type": CONTENT_TYPES.get(path.extname(filename).toLowerCase()) ?? "application/octet-stream",
  };
  response.writeHead(200, headers);
  response.end(request.method === "HEAD" ? undefined : body);
  return true;
}

function methodNotAllowed(response, allowed) {
  sendJson(response, 405, {
    error: { code: "METHOD_NOT_ALLOWED", message: `Allowed methods: ${allowed.join(", ")}` },
  }, { allow: allowed.join(", ") });
}

async function parseWorktrees(output) {
  const contexts = [];
  for (const block of output.trim().split(/\n\s*\n/)) {
    if (!block) continue;
    let worktreePath = "";
    let branch = null;
    let prunable = false;
    for (const line of block.split("\n")) {
      if (line.startsWith("worktree ")) worktreePath = line.slice(9);
      if (line.startsWith("branch refs/heads/")) branch = line.slice(18);
      if (line.startsWith("prunable")) prunable = true;
    }
    if (!worktreePath || prunable) continue;
    try {
      await stat(worktreePath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    contexts.push({ type: "worktree", path: worktreePath, branch });
  }
  return contexts;
}

async function scanDevelopmentContexts(workspacePath, processEnv = process.env) {
  if (!workspacePath) return { workspacePath: null, contexts: [] };
  const environment = processEnv;
  try {
    const rootResult = await execFileAsync("git", ["-C", workspacePath, "rev-parse", "--show-toplevel"], {
      env: environment,
      timeout: 4_000,
      maxBuffer: 1024 * 1024,
    });
    const root = rootResult.stdout.trim();
    const [branchesResult, worktreesResult] = await Promise.all([
      execFileAsync("git", ["-C", root, "for-each-ref", "--format=%(refname:short)", "refs/heads"], {
        env: environment,
        timeout: 4_000,
        maxBuffer: 1024 * 1024,
      }),
      execFileAsync("git", ["-C", root, "worktree", "list", "--porcelain"], {
        env: environment,
        timeout: 4_000,
        maxBuffer: 1024 * 1024,
      }),
    ]);
    const branches = branchesResult.stdout.split("\n").map((branch) => branch.trim()).filter(Boolean);
    return {
      workspacePath: root,
      contexts: [
        ...branches.map((branch) => ({ type: "branch", branch })),
        ...(await parseWorktrees(worktreesResult.stdout)),
      ],
    };
  } catch {
    return { workspacePath, contexts: [] };
  }
}

export function resolveServerOptions(options = {}) {
  const environment = options.processEnv ?? process.env;
  const configuredDataDirectory = options.dataDirectory ?? environment.TASKBOARD_DATA_DIR;
  const dataDirectory = configuredDataDirectory
    ? path.resolve(configuredDataDirectory)
    : path.join(PROJECT_ROOT, ".data");
  const instanceToken = String(
    options.instanceToken ?? environment.TASKBOARD_INSTANCE_TOKEN ?? "",
  ).trim();
  if (instanceToken && !/^[a-z0-9-]{16,128}$/i.test(instanceToken)) {
    throw new Error("TASKBOARD_INSTANCE_TOKEN must be an identifier");
  }
  const instanceSecret = String(
    options.instanceSecret ?? environment.TASKBOARD_INSTANCE_SECRET ?? "",
  ).trim();
  if (instanceToken && !/^[a-f0-9-]{32,128}$/i.test(instanceSecret)) {
    throw new Error("TASKBOARD_INSTANCE_SECRET must be set in launcher mode");
  }
  return {
    dataDirectory,
    databasePath: options.databasePath ?? path.join(dataDirectory, "taskboard.sqlite"),
    attachmentsDirectory: options.attachmentsDirectory ?? path.join(dataDirectory, "attachments"),
    clientStoragePath: options.clientStoragePath ?? path.join(dataDirectory, "client-storage.json"),
    staticDirectory: options.staticDirectory ?? path.join(PROJECT_ROOT, "dist", "web"),
    instanceToken,
    instanceSecret,
    trustedOrigins: parseTrustedOrigins(environment[TRUSTED_ORIGINS_ENV]),
    version: String(
      options.version ?? environment.TASKBOARD_VERSION ?? "development",
    ).trim(),
  };
}

export function resolvePort(value = process.env.TASKBOARD_PORT ?? "47823") {
  const port = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("TASKBOARD_PORT must be an integer between 1 and 65535");
  }
  return port;
}

export function resolveHost(value = process.env.TASKBOARD_HOST ?? "0.0.0.0") {
  const host = String(value).trim();
  if (host !== "127.0.0.1" && host !== "0.0.0.0") {
    throw new Error("TASKBOARD_HOST must be 127.0.0.1 or 0.0.0.0");
  }
  return host;
}

export function createTaskboardServer(options = {}) {
  const resolved = resolveServerOptions(options);
  const processEnvironment = options.processEnv ?? process.env;
  const routePrefix = resolved.instanceToken ? `/${resolved.instanceToken}` : "";
  const database = new TaskboardDatabase(resolved.databasePath);
  const events = new EventHub();
  let clientStorageWrite = Promise.resolve();

  async function readClientStorage() {
    try {
      const value = JSON.parse(await readFile(resolved.clientStoragePath, "utf8"));
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
      if (error.code === "ENOENT") return {};
      throw error;
    }
  }

  function parseClientStorageUpdate(body) {
    assertPlainObject(body);
    assertAllowedKeys(body, new Set(["key", "value"]));
    const key = stringField(body.key, "key", { required: true, maxLength: 512 });
    const value = stringField(body.value, "value", { nullable: true, maxLength: 100_000 });
    return { key, value };
  }

  async function updateClientStorage({ key, value }) {
    clientStorageWrite = clientStorageWrite.catch(() => {}).then(async () => {
      const entries = await readClientStorage();
      if (value === null) delete entries[key];
      else entries[key] = value;
      await mkdir(path.dirname(resolved.clientStoragePath), { recursive: true });
      const temporaryPath = `${resolved.clientStoragePath}.${process.pid}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(entries)}\n`, { mode: 0o600 });
      await chmod(temporaryPath, 0o600);
      await rename(temporaryPath, resolved.clientStoragePath);
      await chmod(resolved.clientStoragePath, 0o600);
    });
    await clientStorageWrite;
  }
  const server = createServer(async (request, response) => {
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("referrer-policy", "no-referrer");
    try {
      const incomingUrl = new URL(request.url, "http://127.0.0.1");
      if (resolved.instanceToken && incomingUrl.pathname !== "/health") {
        if (incomingUrl.pathname === routePrefix) {
          response.writeHead(301, { location: `${incomingUrl.pathname}/${incomingUrl.search}` });
          response.end();
          return;
        }
        if (
          incomingUrl.pathname !== routePrefix
          && !incomingUrl.pathname.startsWith(`${routePrefix}/`)
        ) {
          throw new ApiError(404, "NOT_FOUND", "Route not found");
        }
        request.url = `${incomingUrl.pathname.slice(routePrefix.length) || "/"}${incomingUrl.search}`;
      }

      assertTrustedNetworkRequest(
        request,
        Boolean(resolved.instanceToken),
        resolved.trustedOrigins,
      );
      const origin = request.headers.origin;
      const trustedEmbedOrigin = TRUSTED_EMBED_ORIGINS.has(origin)
        || (Boolean(resolved.instanceToken) && origin === "null");
      if (trustedEmbedOrigin) {
        response.setHeader("access-control-allow-origin", origin);
        response.setHeader("access-control-allow-methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
        response.setHeader(
          "access-control-allow-headers",
          request.headers["access-control-request-headers"] ?? "content-type",
        );
        response.setHeader("access-control-expose-headers", "x-taskboard-proof");
        response.setHeader("access-control-allow-private-network", "true");
        response.setHeader("vary", "origin");
        if (request.method === "OPTIONS") {
          response.writeHead(204);
          response.end();
          return;
        }
      }
      if (resolved.instanceToken && origin === "app://-") {
        const challenge = request.headers["x-taskboard-challenge"];
        if (typeof challenge !== "string" || !/^[a-f0-9]{32,128}$/i.test(challenge)) {
          throw new ApiError(401, "INVALID_INSTANCE_CHALLENGE", "Launcher challenge is required");
        }
        response.setHeader(
          "x-taskboard-proof",
          createHmac("sha256", resolved.instanceSecret).update(challenge).digest("hex"),
        );
      }
      const url = new URL(request.url, "http://127.0.0.1");
      const pathname = url.pathname;
      if (pathname === "/health") {
        if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
        if (resolved.instanceToken) {
          const challenge = request.headers["x-taskboard-challenge"];
          if (typeof challenge !== "string" || !/^[a-f0-9]{32,128}$/i.test(challenge)) {
            throw new ApiError(401, "INVALID_INSTANCE_CHALLENGE", "Launcher challenge is required");
          }
          return sendJson(response, 200, {
            status: "ok",
            product: "taskboard",
            version: resolved.version,
            proof: createHmac("sha256", resolved.instanceSecret)
              .update(challenge)
              .digest("hex"),
          });
        }
        return sendJson(response, 200, { status: "ok" });
      }

      if (pathname === "/api/client-storage") {
        if (request.method === "GET") {
          await clientStorageWrite;
          return sendJson(response, 200, { entries: await readClientStorage() });
        }
        if (request.method === "PATCH") {
          const update = parseClientStorageUpdate(await readJson(request));
          await updateClientStorage(update);
          if (update.key.startsWith(PROJECT_BOARD_DISPLAY_SETTINGS_KEY_PREFIX)) {
            events.emit("client-storage.updated", { key: update.key });
          }
          return sendEmpty(response, 204);
        }
        return methodNotAllowed(response, ["GET", "PATCH"]);
      }

      if (pathname === "/api/meta") {
        if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "GET /api/meta does not accept query parameters");
        }
        return sendJson(response, 200, {});
      }

      if (pathname === "/api/projects") {
        if (request.method === "GET") {
          if ([...url.searchParams.keys()].length > 0) {
            throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "GET /api/projects does not accept query parameters");
          }
          return sendJson(response, 200, { projects: database.listProjects() });
        }
        if (request.method === "POST") {
          const project = database.createProject(parseProjectCreate(await readJson(request)));
          events.emit("project.created", { project });
          return sendJson(response, 201, { project });
        }
        return methodNotAllowed(response, ["GET", "POST"]);
      }

      const projectRoute = pathname.match(/^\/api\/projects\/([^/]+)$/);
      if (projectRoute) {
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Project routes do not accept query parameters");
        }
        let projectId;
        try {
          projectId = decodeURIComponent(projectRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Project id contains invalid encoding");
        }
        validateProjectId(projectId);
        if (request.method === "DELETE") {
          database.deleteProject(projectId);
          return sendEmpty(response, 204);
        }
        return methodNotAllowed(response, ["DELETE"]);
      }

      const projectLabelsRoute = pathname.match(/^\/api\/projects\/([^/]+)\/labels$/);
      if (projectLabelsRoute) {
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Project label routes do not accept query parameters");
        }
        let projectId;
        try {
          projectId = decodeURIComponent(projectLabelsRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Project id contains invalid encoding");
        }
        validateProjectId(projectId);
        if (request.method !== "POST" && request.method !== "DELETE") {
          return methodNotAllowed(response, ["POST", "DELETE"]);
        }
        const label = parseProjectLabel(await readJson(request));
        const project = request.method === "POST"
          ? database.addProjectLabel(projectId, label)
          : database.deleteProjectLabel(projectId, label);
        events.emit("project.labels.updated", { project });
        return sendJson(response, 200, { project });
      }

      const projectReadmeAttachmentsRoute = pathname.match(
        /^\/api\/projects\/([^/]+)\/readme\/attachments$/,
      );
      if (projectReadmeAttachmentsRoute) {
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Project README attachment routes do not accept query parameters");
        }
        let projectId;
        try {
          projectId = decodeURIComponent(projectReadmeAttachmentsRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Project id contains invalid encoding");
        }
        validateProjectId(projectId);
        if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
        const metadata = parseAttachmentHeaders(request);
        if (metadata.kind !== "inline") {
          throw new ApiError(400, "INVALID_ATTACHMENT_KIND", "Project README attachments must be inline");
        }
        const body = await readBody(request, ATTACHMENT_BODY_LIMIT, "Attachment cannot exceed 25 MiB");
        const id = randomUUID();
        await mkdir(resolved.attachmentsDirectory, { recursive: true });
        const storagePath = path.join(resolved.attachmentsDirectory, id);
        await writeFile(storagePath, body, { flag: "wx" });
        let attachment;
        try {
          attachment = database.createProjectReadmeAttachment(projectId, {
            id,
            ...metadata,
            size: body.length,
          });
        } catch (error) {
          await unlink(storagePath);
          throw error;
        }
        return sendJson(response, 201, { attachment });
      }

      const projectReadmeRoute = pathname.match(/^\/api\/projects\/([^/]+)\/readme$/);
      if (projectReadmeRoute) {
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Project README routes do not accept query parameters");
        }
        let projectId;
        try {
          projectId = decodeURIComponent(projectReadmeRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Project id contains invalid encoding");
        }
        validateProjectId(projectId);
        if (request.method === "GET") {
          return sendJson(response, 200, { readme: database.getProjectReadme(projectId) });
        }
        if (request.method === "PUT") {
          const input = parseProjectReadmeSave(await readJson(
            request,
            PROJECT_README_BODY_LIMIT,
            "Project README request cannot exceed 3 MiB",
          ));
          const readme = database.saveProjectReadme(projectId, input.content, input.version);
          events.emit("project.readme.updated", {
            projectId,
            readmeVersion: readme.version,
          });
          return sendJson(response, 200, { readme });
        }
        return methodNotAllowed(response, ["GET", "PUT"]);
      }

      const developmentContextsRoute = pathname.match(/^\/api\/projects\/([^/]+)\/development-contexts$/);
      if (developmentContextsRoute) {
        if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
        const unknownQuery = [...url.searchParams.keys()].filter((key) => (
          key !== "workspacePath"
        ));
        if (unknownQuery.length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", `Unknown query parameter: ${unknownQuery[0]}`);
        }
        let projectId;
        try {
          projectId = decodeURIComponent(developmentContextsRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Project id contains invalid encoding");
        }
        validateProjectId(projectId);
        const project = database.getProject(projectId);
        if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", `Project '${projectId}' does not exist`);
        const deviceWorkspacePath = stringField(
          url.searchParams.get("workspacePath") ?? null,
          "workspacePath",
          { nullable: true, maxLength: 4096 },
        );
        if (deviceWorkspacePath?.includes("\0")) {
          throw new ApiError(400, "INVALID_FIELD", "'workspacePath' cannot contain null bytes");
        }
        const workspacePath = deviceWorkspacePath ?? project.workspacePath ?? null;
        return sendJson(
          response,
          200,
          await scanDevelopmentContexts(workspacePath, processEnvironment),
        );
      }

      if (pathname === "/api/tasks") {
        if (request.method === "GET") {
          const filters = parseTaskFilters(url.searchParams);
          return sendJson(response, 200, { tasks: database.listTasks(filters) });
        }
        if (request.method === "POST") {
          const actor = actorFromRequest(request);
          const { assigneeTarget, ...parsedInput } = parseTaskCreate(await readJson(request));
          const input = parsedInput;
          const task = database.createTask({
            ...input,
            actor,
            assignee: resolveAssignee(assigneeTarget, actor),
          });
          events.emit("task.created", { task });
          return sendJson(response, 201, { task });
        }
        return methodNotAllowed(response, ["GET", "POST"]);
      }

      if (pathname === "/api/events") {
        if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "GET /api/events does not accept query parameters");
        }
        events.connect(request, response);
        return;
      }

      const taskRelationRoute = pathname.match(
        /^\/api\/tasks\/([^/]+)\/relations\/([^/]+)\/([^/]+)$/,
      );
      if (taskRelationRoute) {
        let taskId;
        let type;
        let relatedTaskId;
        try {
          taskId = decodeURIComponent(taskRelationRoute[1]);
          type = decodeURIComponent(taskRelationRoute[2]);
          relatedTaskId = decodeURIComponent(taskRelationRoute[3]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Issue relation path contains invalid encoding");
        }
        if (
          taskId.length === 0
          || taskId.length > 128
          || relatedTaskId.length === 0
          || relatedTaskId.length > 128
        ) {
          throw new ApiError(400, "INVALID_PATH", "Issue relation task id is invalid");
        }
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Issue relation routes do not accept query parameters");
        }
        const relationType = parseIssueRelationType(type);
        if (request.method === "POST") {
          const { version, threadId, threadBinding, origin } = parseRelationMutation(
            await readJson(request),
          );
          const result = database.addTaskRelation(
            taskId,
            version,
            relationType,
            relatedTaskId,
            threadId,
            threadBinding,
            actorFromRequest(request),
            origin,
          );
          events.emit("task.relation.updated", result);
          return sendJson(response, 200, result);
        }
        if (request.method === "DELETE") {
          const { version, threadId, threadBinding, origin } = parseRelationMutation(
            await readJson(request),
          );
          const result = database.removeTaskRelation(
            taskId,
            version,
            relationType,
            relatedTaskId,
            threadId,
            threadBinding,
            actorFromRequest(request),
            origin,
          );
          events.emit("task.relation.updated", result);
          return sendJson(response, 200, result);
        }
        return methodNotAllowed(response, ["POST", "DELETE"]);
      }

      const taskActivitiesRoute = pathname.match(/^\/api\/tasks\/([^/]+)\/activities$/);
      if (taskActivitiesRoute) {
        let taskId;
        try {
          taskId = decodeURIComponent(taskActivitiesRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Task id contains invalid encoding");
        }
        if (taskId.length === 0 || taskId.length > 128) {
          throw new ApiError(400, "INVALID_PATH", "Task id is invalid");
        }
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Activity routes do not accept query parameters");
        }
        if (request.method === "GET") {
          return sendJson(response, 200, { activities: database.listTaskActivities(taskId) });
        }
        return methodNotAllowed(response, ["GET"]);
      }

      const taskCommentsRoute = pathname.match(/^\/api\/tasks\/([^/]+)\/comments$/);
      if (taskCommentsRoute) {
        let taskId;
        try {
          taskId = decodeURIComponent(taskCommentsRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Task id contains invalid encoding");
        }
        if (taskId.length === 0 || taskId.length > 128) {
          throw new ApiError(400, "INVALID_PATH", "Task id is invalid");
        }
        if (request.method === "GET") {
          const after = parseAfterCursor(url.searchParams, "Comment routes");
          const comments = after
            ? database.listCommentsAfter(taskId, after)
            : database.listComments(taskId);
          return sendJson(response, 200, {
            comments,
            nextCursor: nextCursor(comments, after),
          });
        }
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Comment routes do not accept query parameters");
        }
        if (request.method === "POST") {
          const comment = database.createComment(taskId, {
            ...parseCommentCreate(await readJson(request)),
            actor: actorFromRequest(request),
          });
          const task = database.getTask(taskId);
          events.emit("comment.created", { comment, task });
          return sendJson(response, 201, { comment });
        }
        return methodNotAllowed(response, ["GET", "POST"]);
      }

      const commentRoute = pathname.match(/^\/api\/comments\/([^/]+)$/);
      if (commentRoute) {
        let id;
        try {
          id = decodeURIComponent(commentRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Comment id contains invalid encoding");
        }
        if (id.length === 0 || id.length > 128) {
          throw new ApiError(400, "INVALID_PATH", "Comment id is invalid");
        }
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Comment routes do not accept query parameters");
        }
        if (request.method === "PATCH") {
          const patch = parseCommentPatch(await readJson(request));
          const comment = database.updateComment(
            id,
            patch.version,
            patch.body,
            patch.threadId,
            patch.threadBinding,
          );
          const task = database.getTask(comment.taskId);
          events.emit("comment.updated", { comment, task });
          return sendJson(response, 200, { comment });
        }
        if (request.method === "DELETE") {
          const { version } = parseArchive(await readJson(request));
          const comment = database.deleteComment(id, version);
          for (const attachment of comment.attachments) {
            try {
              await unlink(path.join(resolved.attachmentsDirectory, attachment.id));
            } catch (error) {
              if (error.code !== "ENOENT") throw error;
            }
          }
          const task = database.getTask(comment.taskId);
          events.emit("comment.deleted", { comment, task });
          return sendEmpty(response, 204);
        }
        return methodNotAllowed(response, ["PATCH", "DELETE"]);
      }

      const commentAttachmentsRoute = pathname.match(/^\/api\/comments\/([^/]+)\/attachments$/);
      if (commentAttachmentsRoute) {
        let commentId;
        try {
          commentId = decodeURIComponent(commentAttachmentsRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Comment id contains invalid encoding");
        }
        if (commentId.length === 0 || commentId.length > 128) {
          throw new ApiError(400, "INVALID_PATH", "Comment id is invalid");
        }
        if (request.method === "GET") {
          const after = parseAfterCursor(url.searchParams, "Attachment routes");
          const attachments = database.listCommentAttachments(commentId, after);
          return sendJson(response, 200, {
            attachments,
            nextCursor: nextCursor(attachments, after),
          });
        }
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Attachment routes do not accept query parameters");
        }
        if (request.method === "POST") {
          const comment = database.getComment(commentId);
          if (!comment) throw new ApiError(404, "COMMENT_NOT_FOUND", `Comment '${commentId}' does not exist`);
          const metadata = parseAttachmentHeaders(request);
          const body = await readBody(request, ATTACHMENT_BODY_LIMIT, "Attachment cannot exceed 25 MiB");
          const id = randomUUID();
          await mkdir(resolved.attachmentsDirectory, { recursive: true });
          const storagePath = path.join(resolved.attachmentsDirectory, id);
          await writeFile(storagePath, body, { flag: "wx" });
          let attachment;
          try {
            attachment = database.createCommentAttachment(commentId, { id, ...metadata, size: body.length });
          } catch (error) {
            await unlink(storagePath);
            throw error;
          }
          const task = database.getTask(comment.taskId);
          events.emit("attachment.created", { attachment, comment: database.getComment(commentId), task });
          return sendJson(response, 201, { attachment });
        }
        return methodNotAllowed(response, ["GET", "POST"]);
      }

      const taskAttachmentsRoute = pathname.match(/^\/api\/tasks\/([^/]+)\/attachments$/);
      if (taskAttachmentsRoute) {
        let taskId;
        try {
          taskId = decodeURIComponent(taskAttachmentsRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Task id contains invalid encoding");
        }
        if (taskId.length === 0 || taskId.length > 128) {
          throw new ApiError(400, "INVALID_PATH", "Task id is invalid");
        }
        if (request.method === "GET") {
          const after = parseAfterCursor(url.searchParams, "Attachment routes");
          const attachments = database.listAttachments(taskId, after);
          return sendJson(response, 200, {
            attachments,
            nextCursor: nextCursor(attachments, after),
          });
        }
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Attachment routes do not accept query parameters");
        }
        if (request.method === "POST") {
          const task = database.getTask(taskId);
          if (!task) throw new ApiError(404, "TASK_NOT_FOUND", `Task '${taskId}' does not exist`);
          const metadata = parseAttachmentHeaders(request);
          const body = await readBody(request, ATTACHMENT_BODY_LIMIT, "Attachment cannot exceed 25 MiB");
          const id = randomUUID();
          await mkdir(resolved.attachmentsDirectory, { recursive: true });
          const storagePath = path.join(resolved.attachmentsDirectory, id);
          await writeFile(storagePath, body, { flag: "wx" });
          let attachment;
          try {
            attachment = database.createAttachment(taskId, { id, ...metadata, size: body.length });
          } catch (error) {
            await unlink(storagePath);
            throw error;
          }
          events.emit("attachment.created", { attachment, task });
          return sendJson(response, 201, { attachment });
        }
        return methodNotAllowed(response, ["GET", "POST"]);
      }

      const attachmentContentRoute = pathname.match(/^\/api\/attachments\/([^/]+)\/(content|download)$/);
      if (attachmentContentRoute) {
        let id;
        try {
          id = decodeURIComponent(attachmentContentRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Attachment id contains invalid encoding");
        }
        if (id.length === 0 || id.length > 128) {
          throw new ApiError(400, "INVALID_PATH", "Attachment id is invalid");
        }
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Attachment routes do not accept query parameters");
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
          return methodNotAllowed(response, ["GET", "HEAD"]);
        }
        const attachment = database.getAttachment(id) ?? database.getProjectReadmeAttachment(id);
        if (!attachment) throw new ApiError(404, "ATTACHMENT_NOT_FOUND", `Attachment '${id}' does not exist`);
        const body = await readFile(path.join(resolved.attachmentsDirectory, attachment.id));
        const encodedFilename = encodeURIComponent(attachment.filename).replace(/['()*]/g, (character) => (
          `%${character.charCodeAt(0).toString(16).toUpperCase()}`
        ));
        const canOpenInline = attachmentContentRoute[2] === "content"
          && (
            INLINE_ATTACHMENT_TYPES.has(attachment.contentType)
            || attachment.contentType.startsWith("video/")
          );
        response.writeHead(200, {
          "cache-control": "private, no-store",
          "content-disposition": `${canOpenInline ? "inline" : "attachment"}; filename*=UTF-8''${encodedFilename}`,
          "content-length": body.length,
          "content-security-policy": "sandbox; default-src 'none'",
          "content-type": canOpenInline ? attachment.contentType : "application/octet-stream",
        });
        response.end(request.method === "HEAD" ? undefined : body);
        return;
      }

      const attachmentRoute = pathname.match(/^\/api\/attachments\/([^/]+)$/);
      if (attachmentRoute) {
        let id;
        try {
          id = decodeURIComponent(attachmentRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Attachment id contains invalid encoding");
        }
        if (id.length === 0 || id.length > 128) {
          throw new ApiError(400, "INVALID_PATH", "Attachment id is invalid");
        }
        if ([...url.searchParams.keys()].length > 0) {
          throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "Attachment routes do not accept query parameters");
        }
        if (request.method !== "DELETE") return methodNotAllowed(response, ["DELETE"]);
        const attachment = database.getAttachment(id);
        if (!attachment) throw new ApiError(404, "ATTACHMENT_NOT_FOUND", `Attachment '${id}' does not exist`);
        try {
          await unlink(path.join(resolved.attachmentsDirectory, attachment.id));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        database.deleteAttachment(id);
        const task = database.getTask(attachment.taskId);
        events.emit("attachment.deleted", { attachment, task });
        return sendEmpty(response, 204);
      }

      const taskTreeRoute = pathname.match(/^\/api\/tasks\/([^/]+)\/tree$/);
      if (taskTreeRoute) {
        let id;
        try {
          id = decodeURIComponent(taskTreeRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Task id contains invalid encoding");
        }
        if (id.length === 0 || id.length > 128) {
          throw new ApiError(400, "INVALID_PATH", "Task id is invalid");
        }
        if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
        const { direction, depth } = parseTaskTreeQuery(url.searchParams);
        return sendJson(response, 200, { tree: database.getTaskTree(id, direction, depth) });
      }

      const taskRoute = pathname.match(/^\/api\/tasks\/([^/]+)(?:\/(archive|restore|move))?$/);
      if (taskRoute) {
        let id;
        try {
          id = decodeURIComponent(taskRoute[1]);
        } catch {
          throw new ApiError(400, "INVALID_PATH", "Task id contains invalid encoding");
        }
        if (id.length === 0 || id.length > 128) {
          throw new ApiError(400, "INVALID_PATH", "Task id is invalid");
        }
        const action = taskRoute[2];
        if (!action && request.method === "GET") {
          if ([...url.searchParams.keys()].length > 0) {
            throw new ApiError(400, "UNKNOWN_QUERY_PARAMETER", "GET /api/tasks/:id does not accept query parameters");
          }
          const task = database.getTask(id);
          if (!task) throw new ApiError(404, "TASK_NOT_FOUND", `Task '${id}' does not exist`);
          return sendJson(response, 200, { task });
        }
        if (!action && request.method === "PATCH") {
          const actor = actorFromRequest(request);
          const {
            version,
            changes,
            threadId,
            threadBinding,
            assigneeTarget,
          } = parseTaskPatch(await readJson(request));
          const current = database.getTask(id);
          if (!current) throw new ApiError(404, "TASK_NOT_FOUND", `Task '${id}' does not exist`);
          if (assigneeTarget !== undefined) {
            changes.assignee = resolveAssignee(assigneeTarget, actor);
          }
          const task = database.updateTask(id, version, changes, threadId, threadBinding, actor);
          events.emit("task.updated", { task });
          return sendJson(response, 200, { task });
        }
        if (!action && request.method === "DELETE") {
          const { version } = parseArchive(await readJson(request));
          const deleted = database.deleteArchivedTask(id, version);
          for (const attachmentId of deleted.attachmentIds) {
            try {
              await unlink(path.join(resolved.attachmentsDirectory, attachmentId));
            } catch (error) {
              if (error.code !== "ENOENT") throw error;
            }
          }
          events.emit("task.deleted", { task: deleted.task });
          return sendEmpty(response, 204);
        }
        if (action === "move" && request.method === "POST") {
          const move = parseMove(await readJson(request));
          const current = database.getTask(id);
          if (!current) throw new ApiError(404, "TASK_NOT_FOUND", `Task '${id}' does not exist`);
          const task = database.moveTask(
            id,
            move.version,
            move.status,
            move.sortOrder,
            move.threadId,
            move.threadBinding,
            actorFromRequest(request),
          );
          events.emit("task.moved", { task });
          return sendJson(response, 200, { task });
        }
        if (action === "archive" && request.method === "POST") {
          const { version, threadId, threadBinding } = parseArchive(await readJson(request));
          const task = database.archiveTask(
            id,
            version,
            threadId,
            threadBinding,
            actorFromRequest(request),
          );
          events.emit("task.archived", { task });
          return sendJson(response, 200, { task });
        }
        if (action === "restore" && request.method === "POST") {
          const { version, threadId, threadBinding } = parseArchive(await readJson(request));
          const task = database.restoreTask(
            id,
            version,
            threadId,
            threadBinding,
            actorFromRequest(request),
          );
          events.emit("task.restored", { task });
          return sendJson(response, 200, { task });
        }
        return methodNotAllowed(response, action ? ["POST"] : ["GET", "PATCH", "DELETE"]);
      }

      if (pathname.startsWith("/api/")) {
        throw new ApiError(404, "NOT_FOUND", "API route not found");
      }
      if (await serveStatic(request, response, pathname, resolved.staticDirectory)) return;
      throw new ApiError(404, "NOT_FOUND", "Resource not found");
    } catch (error) {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      if (error instanceof ApiError) {
        const payload = { error: { code: error.code, message: error.message } };
        if (error.details !== undefined) payload.error.details = error.details;
        sendJson(response, error.status, payload);
        return;
      }
      console.error(error);
      sendJson(response, 500, { error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  let listening = false;
  return {
    database,
    server,
    options: resolved,
    async listen({ host = "127.0.0.1", port = resolvePort(), fd = null } = {}) {
      if (host !== "127.0.0.1" && host !== "0.0.0.0") {
        throw new Error("Taskboard server must bind to 127.0.0.1 or 0.0.0.0");
      }
      if (fd !== null && (!Number.isInteger(fd) || fd < 3 || fd > 255)) {
        throw new Error("Taskboard server listen fd must be an inherited file descriptor");
      }
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          server.off("error", onError);
          resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        if (fd === null) server.listen(port, host);
        else server.listen({ fd });
      });
      listening = true;
      return server.address();
    },
    async close() {
      const serverClosed = listening
        ? new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
          })
        : Promise.resolve();
      events.close();
      await serverClosed;
      listening = false;
      database.close();
    },
  };
}
