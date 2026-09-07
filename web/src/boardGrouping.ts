export interface ColumnRow<T> {
  task: T;
  depth: 0 | 1;
  childCount: number;
  hidden: boolean;
}

export function groupColumnTasks<
  T extends { id: string; relations: { parent: { id: string } | null } },
>(tasks: readonly T[], collapsedParents: ReadonlySet<string>): ColumnRow<T>[] {
  const ids = new Set(tasks.map((task) => task.id));
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const parentOf = (task: T): string | null => {
    const parentId = task.relations.parent?.id;
    return parentId && ids.has(parentId) ? parentId : null;
  };
  const isNested = (task: T): boolean => {
    const parentId = parentOf(task);
    const parent = parentId ? tasksById.get(parentId) : undefined;
    return parent !== undefined && parentOf(parent) === null;
  };
  const childrenByParent = new Map<string, T[]>();

  for (const task of tasks) {
    if (!isNested(task)) continue;
    const parentId = parentOf(task);
    if (!parentId) continue;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(task);
    childrenByParent.set(parentId, children);
  }

  const rows: ColumnRow<T>[] = [];
  for (const task of tasks) {
    if (isNested(task)) continue;
    const children = childrenByParent.get(task.id) ?? [];
    rows.push({ task, depth: 0, childCount: children.length, hidden: false });
    for (const child of children) {
      rows.push({
        task: child,
        depth: 1,
        childCount: 0,
        hidden: collapsedParents.has(task.id),
      });
    }
  }

  return rows;
}
