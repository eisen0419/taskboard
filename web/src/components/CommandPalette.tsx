import { Fragment, type KeyboardEvent, type MouseEvent } from "react";
import { useTaskboardI18n } from "../i18n";

export interface CommandPaletteItem {
  id: string;
  kind: "view" | "project" | "task";
  label: string;
  hint?: string;
}

export interface CommandPaletteGroup {
  id: string;
  label: string;
  items: CommandPaletteItem[];
}

interface CommandPaletteProps {
  query: string;
  onQueryChange: (query: string) => void;
  groups: CommandPaletteGroup[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: CommandPaletteItem) => void;
  onClose: () => void;
}

export function CommandPalette({
  query,
  onQueryChange,
  groups,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onClose,
}: CommandPaletteProps) {
  const { text } = useTaskboardI18n();
  const items = groups.flatMap((group) => group.items);
  const total = items.length;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (total > 0) onActiveIndexChange((activeIndex + 1) % total);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (total > 0) onActiveIndexChange((activeIndex - 1 + total) % total);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (total > 0 && items[activeIndex]) onSelect(items[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  let selectableIndex = 0;

  return (
    <div className="command-palette-backdrop" onClick={closeFromBackdrop}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label={text("命令面板", "Command palette")}
      >
        <input
          autoFocus
          data-testid="command-palette-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={text("搜索议题、项目或视图…", "Search issues, projects, or views…")}
        />
        {total > 0 ? (
          <ul role="listbox">
            {groups.map((group) => group.items.length > 0 && (
              <Fragment key={group.id}>
                <li className="command-palette-group">{group.label}</li>
                {group.items.map((item) => {
                  const itemIndex = selectableIndex++;
                  return (
                    <li
                      key={item.id}
                      className="command-palette-item"
                      role="option"
                      data-testid="command-palette-item"
                      aria-selected={itemIndex === activeIndex}
                      onMouseEnter={() => onActiveIndexChange(itemIndex)}
                      onClick={() => onSelect(item)}
                    >
                      <span>{item.label}</span>
                      {item.hint && <small>{item.hint}</small>}
                    </li>
                  );
                })}
              </Fragment>
            ))}
          </ul>
        ) : (
          <div className="command-palette-empty">
            {text("没有匹配项", "No matches")}
          </div>
        )}
      </div>
    </div>
  );
}
