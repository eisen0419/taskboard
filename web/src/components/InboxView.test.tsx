import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskboardLanguageProvider } from "../i18n";
import type { InboxItem } from "../types";
import { InboxView } from "./InboxView";

const item: InboxItem = {
  id: "inbox-1",
  taskId: "task-1",
  projectId: "local",
  taskTitle: "修复通知",
  kind: "status_changed",
  severity: "action_required",
  summary: "Agent 把「修复通知」改为 等你确认",
  actor: { type: "agent", id: "agent", name: "Agent", avatarUrl: null },
  createdAt: "2026-09-06T00:00:00.000Z",
  readAt: null,
  archivedAt: null,
};

function renderInbox(overrides: Partial<Parameters<typeof InboxView>[0]> = {}) {
  const props = {
    items: [item],
    unreadCount: 1,
    onMarkRead: vi.fn(),
    onArchive: vi.fn(),
    onReadAll: vi.fn(),
    onOpenTask: vi.fn(),
    ...overrides,
  };
  render(
    <TaskboardLanguageProvider language="zh">
      <InboxView {...props} />
    </TaskboardLanguageProvider>,
  );
  return props;
}

afterEach(cleanup);

describe("InboxView", () => {
  it("renders the severity label and summary", () => {
    renderInbox();

    expect(screen.getByText("需要处理").className).toContain("inbox-severity-action_required");
    expect(screen.getByText(item.summary)).toBeTruthy();
  });

  it("marks an item as read", () => {
    const props = renderInbox();

    fireEvent.click(screen.getByRole("button", { name: "标为已读" }));
    expect(props.onMarkRead).toHaveBeenCalledWith(item.id);
  });

  it("opens a task and archives its item", () => {
    const props = renderInbox();

    fireEvent.click(screen.getByRole("button", { name: item.taskTitle }));
    fireEvent.click(screen.getByRole("button", { name: "归档" }));
    expect(props.onOpenTask).toHaveBeenCalledWith(item);
    expect(props.onArchive).toHaveBeenCalledWith(item.id);
  });

  it("renders the empty state", () => {
    renderInbox({ items: [], unreadCount: 0 });

    expect(screen.getByText("收件箱是空的")).toBeTruthy();
    expect(screen.getByRole("button", { name: "全部已读" }).hasAttribute("disabled")).toBe(true);
  });
});
