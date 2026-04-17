import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

export interface NewReminder {
  title: string;
  time: string;
  date: string;
  repeat: string;
  icon: string;
  advance: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (reminder: NewReminder) => void;
}

const repeatOptions = [
  { value: "once", label: "Один раз" },
  { value: "daily", label: "Каждый день" },
  { value: "weekdays", label: "По будням" },
  { value: "weekly", label: "Еженедельно" },
];

const advanceOptions = [
  { value: "none", label: "Без предупреждения" },
  { value: "1h", label: "За 1 час" },
  { value: "3h", label: "За 3 часа" },
  { value: "6h", label: "За 6 часов" },
  { value: "1d", label: "За 1 день" },
  { value: "2d", label: "За 2 дня" },
];

const iconOptions = [
  { value: "Bell", label: "Общее" },
  { value: "Sun", label: "Утро" },
  { value: "Moon", label: "Вечер" },
  { value: "Coffee", label: "Перерыв" },
  { value: "Users", label: "Встреча" },
  { value: "Heart", label: "Здоровье" },
  { value: "BookOpen", label: "Учёба" },
  { value: "Dumbbell", label: "Спорт" },
];

const ReminderModal = ({ open, onClose, onSave }: Props) => {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [repeat, setRepeat] = useState("once");
  const [icon, setIcon] = useState("Bell");
  const [advance, setAdvance] = useState("none");

  useEffect(() => {
    if (open) {
      setTitle("");
      setTime("09:00");
      setDate(new Date().toISOString().split("T")[0]);
      setRepeat("once");
      setIcon("Bell");
      setAdvance("none");
    }
  }, [open]);

  const repeatLabel = () => {
    if (repeat === "once") {
      const d = new Date(date + "T00:00:00");
      const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
      return `${d.getDate()} ${months[d.getMonth()]}`;
    }
    return repeatOptions.find((r) => r.value === repeat)?.label ?? "";
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), time, date: repeatLabel(), repeat, icon, advance });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <h2 className="modal-title">Новое напоминание</h2>
          <button className="modal-close" onClick={onClose}>
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="modal-field">
          <label className="modal-label">Название</label>
          <input
            className="modal-input"
            placeholder="О чём напомнить?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        {/* Time + Date row */}
        <div className="modal-row">
          <div className="modal-field modal-field--half">
            <label className="modal-label">Время</label>
            <input
              type="time"
              className="modal-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="modal-field modal-field--half">
            <label className="modal-label">Дата</label>
            <input
              type="date"
              className="modal-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={repeat !== "once"}
            />
          </div>
        </div>

        {/* Advance notice */}
        <div className="modal-field">
          <label className="modal-label">Напомнить заранее</label>
          <div className="chip-row chip-row--wrap">
            {advanceOptions.map((a) => (
              <button
                key={a.value}
                className={`cat-chip ${advance === a.value ? "cat-chip--active" : ""}`}
                onClick={() => setAdvance(a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Repeat */}
        <div className="modal-field">
          <label className="modal-label">Повтор</label>
          <div className="chip-row">
            {repeatOptions.map((r) => (
              <button
                key={r.value}
                className={`cat-chip ${repeat === r.value ? "cat-chip--active" : ""}`}
                onClick={() => setRepeat(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icon */}
        <div className="modal-field">
          <label className="modal-label">Иконка</label>
          <div className="icon-picker">
            {iconOptions.map((ic) => (
              <button
                key={ic.value}
                className={`icon-pick-btn ${icon === ic.value ? "icon-pick-btn--active" : ""}`}
                onClick={() => setIcon(ic.value)}
                title={ic.label}
              >
                <Icon name={ic.value} size={18} />
              </button>
            ))}
          </div>
        </div>

        <button className="modal-save-btn" onClick={handleSave} disabled={!title.trim()}>
          Добавить напоминание
        </button>
      </div>
    </div>
  );
};

export default ReminderModal;
