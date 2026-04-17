import { useState } from "react";
import Icon from "@/components/ui/icon";
import ReminderModal, { type NewReminder } from "@/components/ReminderModal";
import SwipeRow from "@/components/SwipeRow";

interface Reminder {
  id: number;
  title: string;
  time: string;
  date: string;
  repeat: string;
  active: boolean;
  icon: string;
}

const initialReminders: Reminder[] = [
  { id: 1, title: "Утренняя зарядка", time: "07:30", date: "Каждый день", repeat: "daily", active: true, icon: "Sun" },
  { id: 2, title: "Обед", time: "13:00", date: "По будням", repeat: "weekdays", active: true, icon: "Coffee" },
  { id: 3, title: "Встреча с командой", time: "15:00", date: "Сегодня, 17 апр", repeat: "once", active: true, icon: "Users" },
  { id: 4, title: "Вечерняя прогулка", time: "19:00", date: "Каждый день", repeat: "daily", active: false, icon: "Moon" },
  { id: 5, title: "Планирование недели", time: "09:00", date: "По понедельникам", repeat: "weekly", active: true, icon: "LayoutList" },
];

const RemindersPage = () => {
  const [reminders, setReminders] = useState(initialReminders);
  const [modalOpen, setModalOpen] = useState(false);

  const toggleActive = (id: number) => {
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r));
  };

  const remove = (id: number) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const addReminder = (r: NewReminder) => {
    setReminders((prev) => [...prev, {
      id: Date.now(),
      title: r.title,
      time: r.time,
      date: r.date,
      repeat: r.repeat,
      active: true,
      icon: r.icon,
    }]);
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
                <span className="reminder-sep">·</span>
                <span>{r.date}</span>
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
      </div>

      <button className="add-reminder-btn" onClick={() => setModalOpen(true)}>
        <Icon name="Plus" size={16} />
        Добавить напоминание
      </button>

      <ReminderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addReminder}
      />
    </div>
  );
};

export default RemindersPage;