import { useTaskboardI18n } from "../i18n";
import type { InboxItem } from "../types";

interface InboxViewProps {
  items: InboxItem[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onReadAll: () => void;
  onOpenTask: (item: InboxItem) => void;
}

const SEVERITY_LABELS = {
  action_required: ["需要处理", "Action required"],
  attention: ["请留意", "Attention"],
  info: ["信息", "Info"],
} as const;

export function InboxView({
  items,
  unreadCount,
  onMarkRead,
  onArchive,
  onReadAll,
  onOpenTask,
}: InboxViewProps) {
  const { text } = useTaskboardI18n();

  return (
    <section className="inbox-view" aria-label={text("收件箱", "Inbox")}>
      <header className="inbox-header">
        <div>
          <h2>{text("收件箱", "Inbox")}</h2>
          <span>{text(`${unreadCount} 条未读`, `${unreadCount} unread`)}</span>
        </div>
        <button
          className="button secondary"
          type="button"
          disabled={unreadCount === 0}
          onClick={onReadAll}
        >
          {text("全部已读", "Mark all as read")}
        </button>
      </header>

      {items.length === 0 ? (
        <div className="inbox-empty">{text("收件箱是空的", "Inbox is empty")}</div>
      ) : (
        <ul className="inbox-list">
          {items.map((item) => {
            const severityLabel = SEVERITY_LABELS[item.severity];
            return (
              <li className="inbox-item" key={item.id}>
                <span className={`inbox-severity inbox-severity-${item.severity}`}>
                  {text(severityLabel[0], severityLabel[1])}
                </span>
                <div className="inbox-item-content">
                  <p>{item.summary}</p>
                  <button type="button" onClick={() => onOpenTask(item)}>
                    {item.taskTitle}
                  </button>
                </div>
                <div className="inbox-item-actions">
                  <button className="button secondary" type="button" onClick={() => onMarkRead(item.id)}>
                    {text("标为已读", "Mark as read")}
                  </button>
                  <button className="button secondary" type="button" onClick={() => onArchive(item.id)}>
                    {text("归档", "Archive")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
