import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

type Priority = "high" | "medium" | "low";

export interface NewTask {
  text: string;
  priority: Priority;
  category: string;
  date: string;
  advance: string;
  advanceTime: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (task: NewTask) => void;
}

const categories = ["Работа", "Личное", "Развитие", "Здоровье", "Общее"];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "high", label: "Высокий", color: "#ef4444" },
  { value: "medium", label: "Средний", color: "#f59e0b" },
  { value: "low", label: "Низкий", color: "#10b981" },
];

const advanceOptions = [
  { value: "none", label: "Нет" },
  { value: "За 1 час", label: "За 1 час" },
  { value: "За 3 часа", label: "За 3 часа" },
  { value: "За 6 часов", label: "За 6 часов" },
  { value: "За 1 день", label: "За 1 день" },
  { value: "За 2 дня", label: "За 2 дня" },
  { value: "custom", label: "Своё время" },
];

const TaskModal = ({ open, onClose, onSave }: Props) => {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState("Работа");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [advance, setAdvance] = useState("none");
  const [advanceTime, setAdvanceTime] = useState("");

  useEffect(() => {
    if (open) {
      setText("");
      setPriority("medium");
      setCategory("Работа");
      setDate(new Date().toISOString().split("T")[0]);
      setAdvance("none");
      setAdvanceTime("");
    }
  }, [open]);

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({ text: text.trim(), priority, category, date, advance, advanceTime });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <h2 className="modal-title">Новая задача</h2>
          <button className="modal-close" onClick={onClose}>
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Text */}
        <div className="modal-field">
          <label className="modal-label">Название</label>
          <textarea
            className="modal-textarea"
            placeholder="Что нужно сделать?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            autoFocus
          />
        </div>

        {/* Date */}
        <div className="modal-field">
          <label className="modal-label">Дата</label>
          <input
            type="date"
            className="modal-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Priority */}
        <div className="modal-field">
          <label className="modal-label">Приоритет</label>
          <div className="priority-row">
            {priorityOptions.map((p) => (
              <button
                key={p.value}
                className={`priority-chip ${priority === p.value ? "priority-chip--active" : ""}`}
                style={priority === p.value ? { borderColor: p.color, background: p.color + "18" } : {}}
                onClick={() => setPriority(p.value)}
              >
                <span className="priority-dot" style={{ background: p.color }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="modal-field">
          <label className="modal-label">Категория</label>
          <div className="chip-row chip-row--wrap">
            {categories.map((c) => (
              <button
                key={c}
                className={`cat-chip ${category === c ? "cat-chip--active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Advance notification */}
        <div className="modal-field">
          <label className="modal-label">
            <Icon name="Bell" size={13} />
            Напомнить заранее
          </label>
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
          {advance === "custom" && (
            <div className="advance-custom">
              <input
                type="time"
                className="modal-input"
                value={advanceTime}
                onChange={(e) => setAdvanceTime(e.target.value)}
                placeholder="Время предупреждения"
              />
              <span className="advance-custom-hint">Укажите точное время напоминания</span>
            </div>
          )}
        </div>

        <button className="modal-save-btn" onClick={handleSave} disabled={!text.trim()}>
          Добавить задачу
        </button>
      </div>
    </div>
  );
};

export default TaskModal;
