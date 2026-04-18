import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ReminderModal, { type NewReminder } from "@/components/ReminderModal";
import SwipeRow from "@/components/SwipeRow";
import { api, type Reminder } from "@/hooks/useApi";

const advanceLabel: Record<string, string> = {
  none: "", "1h": "за 1 час", "3h": "за 3 часа",
  "6h": "за 6 часов", "1d": "за 1 день", "2d": "за 2 дня",
};

const RemindersPage = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api.getReminders()
      .then(setReminders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (id: number) => {
    const r = reminders.find((r) => r.id === id);
    if (!r) return;
    const updated = { ...r, active: !r.active };
    setReminders((prev) => prev.map((rem) => rem.id === id ? updated : rem));
    await api.updateReminder(id, { active: updated.active }).catch(() => {});
  };

  const remove = async (id: number) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await api.deleteReminder(id).catch(() => {});
  };

  const addReminder = async (r: NewReminder) => {
    const created = await api.createReminder({
      title: r.title, time: r.time, date: r.date,
      repeat: r.repeat, active: true, icon: r.icon, advance: r.advance,
    }).catch(() => null);
    if (created) setReminders((prev) => [...prev, created]);
  };

  const activeCount = reminders.filter((r) => r.active).length;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Напоминания</h1>
        <button className="icon-btn" onClick={() => setModalOpen(true)}>
          <Icon name="Plus" size={20} />
        </button>
      </div>

      <p className="page-sub">{activeCount} активных напоминаний</p>

      {loading ? (
        <div className="empty-state"><span className="auth-spinner auth-spinner--lg" /></div>
      ) : (
        <div className="reminder-list">
          {reminders.map((r) => (
            <SwipeRow
              key={r.id}
              onDelete={() => remove(r.id)}
              className={`reminder-card ${!r.active ? "reminder-card--inactive" : ""}`}
            >
              <div className="reminder-icon-wrap">
                <Icon name={r.icon} size={18} />
              </div>
              <div className="reminder-info">
                <span className="reminder-title">{r.title}</span>
                <div className="reminder-meta">
                  <Icon name="Clock" size={12} />
                  <span>{r.time}</span>
                  {r.date && <><span className="reminder-sep">·</span><span>{r.date}</span></>}
                  {r.advance && r.advance !== "none" && (
                    <><span className="reminder-sep">·</span>
                    <span className="reminder-advance">
                      <Icon name="BellDot" size={11} />
                      {advanceLabel[r.advance] || r.advance}
                    </span></>
                  )}
                </div>
              </div>
              <button
                className={`toggle-switch ${r.active ? "toggle-switch--on" : ""}`}
                onClick={(e) => { e.stopPropagation(); toggleActive(r.id); }}
              >
                <span className="toggle-knob" />
              </button>
            </SwipeRow>
          ))}
          {reminders.length === 0 && (
            <div className="empty-state"><Icon name="Bell" size={32} /><p>Напоминаний нет</p></div>
          )}
        </div>
      )}

      <button className="add-reminder-btn" onClick={() => setModalOpen(true)}>
        <Icon name="Plus" size={16} />
        Добавить напоминание
      </button>

      <ReminderModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={addReminder} />
    </div>
  );
};

export default RemindersPage;
