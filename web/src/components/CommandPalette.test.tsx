import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskboardLanguageProvider } from "../i18n";
import {
  CommandPalette,
  type CommandPaletteGroup,
  type CommandPaletteItem,
} from "./CommandPalette";

const viewItem: CommandPaletteItem = {
  id: "view:issues",
  kind: "view",
  label: "议题看板",
};
const projectItem: CommandPaletteItem = {
  id: "project:local",
  kind: "project",
  label: "Taskboard",
  hint: "local",
};
const taskItem: CommandPaletteItem = {
  id: "task:task-1",
  kind: "task",
  label: "TASK-1 修复通知",
  hint: "等你确认",
};
const groups: CommandPaletteGroup[] = [
  { id: "views", label: "视图", items: [viewItem] },
  { id: "results", label: "结果", items: [projectItem, taskItem] },
];

function renderPalette(overrides: Partial<Parameters<typeof CommandPalette>[0]> = {}) {
  const props = {
    query: "",
    onQueryChange: vi.fn(),
    groups,
    activeIndex: 0,
    onActiveIndexChange: vi.fn(),
    onSelect: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(
    <TaskboardLanguageProvider language="zh">
      <CommandPalette {...props} />
    </TaskboardLanguageProvider>,
  );
  return props;
}

afterEach(cleanup);

describe("CommandPalette", () => {
  it("renders groups and items", () => {
    renderPalette({ activeIndex: 1 });

    expect(screen.getByText("视图")).toBeTruthy();
    expect(screen.getByText("结果")).toBeTruthy();
    expect(screen.getByText(viewItem.label)).toBeTruthy();
    expect(screen.getByText(projectItem.label)).toBeTruthy();
    expect(screen.getByText(taskItem.label)).toBeTruthy();
    const items = screen.getAllByTestId("command-palette-item");
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  it("ArrowDown moves the active row and wraps", () => {
    const downProps = renderPalette({ activeIndex: 2 });
    fireEvent.keyDown(screen.getByTestId("command-palette-input"), { key: "ArrowDown" });
    expect(downProps.onActiveIndexChange).toHaveBeenCalledWith(0);

    cleanup();
    const upProps = renderPalette({ activeIndex: 0 });
    fireEvent.keyDown(screen.getByTestId("command-palette-input"), { key: "ArrowUp" });
    expect(upProps.onActiveIndexChange).toHaveBeenCalledWith(2);
  });

  it("Enter selects the active item", () => {
    const props = renderPalette({ activeIndex: 1 });

    fireEvent.keyDown(screen.getByTestId("command-palette-input"), { key: "Enter" });
    expect(props.onSelect).toHaveBeenCalledWith(projectItem);
  });

  it("Escape closes the palette", () => {
    const props = renderPalette();

    fireEvent.keyDown(screen.getByTestId("command-palette-input"), { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("typing calls onQueryChange", () => {
    const props = renderPalette();

    fireEvent.change(screen.getByTestId("command-palette-input"), {
      target: { value: "in" },
    });
    expect(props.onQueryChange).toHaveBeenCalledWith("in");
  });

  it("renders the empty state", () => {
    const props = renderPalette({ groups: [] });
    const input = screen.getByTestId("command-palette-input");

    expect(screen.getByText("没有匹配项")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onSelect).not.toHaveBeenCalled();
  });
});
