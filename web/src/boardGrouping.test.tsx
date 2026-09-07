import { describe, expect, it } from "vitest";
import { groupColumnTasks } from "./boardGrouping";

const t = (id: string, parent: string | null = null) => ({
  id,
  relations: { parent: parent ? { id: parent } : null },
});

describe("groupColumnTasks", () => {
  it("keeps order when there are no relations", () => {
    const rows = groupColumnTasks([t("A"), t("B"), t("C")], new Set());

    expect(rows.map((row) => row.task.id)).toEqual(["A", "B", "C"]);
    expect(rows.map((row) => row.depth)).toEqual([0, 0, 0]);
  });

  it("nests same-column children right after their parent", () => {
    const rows = groupColumnTasks(
      [t("P"), t("X"), t("c1", "P"), t("c2", "P")],
      new Set(),
    );

    expect(rows.map((row) => row.task.id)).toEqual(["P", "c1", "c2", "X"]);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 1, 0]);
  });

  it("keeps children flat when the parent is in another column", () => {
    const rows = groupColumnTasks([t("c", "P"), t("X")], new Set());

    expect(rows.map((row) => row.task.id)).toEqual(["c", "X"]);
    expect(rows.map((row) => row.depth)).toEqual([0, 0]);
  });

  it("caps nesting at one level", () => {
    const rows = groupColumnTasks([t("P"), t("c", "P"), t("g", "c")], new Set());

    expect(rows.map((row) => row.task.id)).toEqual(["P", "c", "g"]);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 0]);
  });

  it("hides children of collapsed parents", () => {
    const rows = groupColumnTasks(
      [t("P"), t("c1", "P"), t("c2", "P")],
      new Set(["P"]),
    );

    expect(rows.map((row) => row.hidden)).toEqual([false, true, true]);
    expect(rows[0]?.childCount).toBe(2);
  });

  it("counts nested children", () => {
    const rows = groupColumnTasks(
      [t("P"), t("c1", "P"), t("X"), t("c2", "P")],
      new Set(),
    );

    expect(rows.find((row) => row.task.id === "P")?.childCount).toBe(2);
    expect(rows.find((row) => row.task.id === "X")?.childCount).toBe(0);
  });
});
