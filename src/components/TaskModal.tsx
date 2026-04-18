import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { MELODY_OPTIONS, playMelody, type MelodyId } from "@/utils/melodies";

type Priority = "high" | "medium" | "low";

export interface NewTask {
  text: string;
  priority: Priority;
  category: string;
  date: string;
  time: string;
  advance: string;
  advanceTime: string;
  melody: MelodyId;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (task: NewTask) => void;
  defaultDate?: string;
  initial?: Partial<NewTask>;
  editMode?: boolean;
  onDelete?: () => void;
}

const categories = ["Работа", "Личное", "Развитие", "Здоровье", "Общее"];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "high", label: "Высокий", color: "#ef4444" },
  { value: "medium", label: "Средний", color: "#f59e0b" },
  { value: "low", label: "Низкий", color: "#10b981" },
];

const advanceOptions = [
  { value: "none", label: "Нет" },
  { value: "За 15 мин", label: "За 15 мин" },
  { value: "За 1 час", label: "За 1 час" },
  { value: "За 3 часа", label: "За 3 часа" },
  { value: "За 1 день", label: "За 1 день" },
  { value: "custom", label: "Своё время" },
];

const TaskModal = ({ open, onClose, onSave, defaultDate, initial, editMode, onDelete }: Props) => {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState("Работа");
  const [date, setDate] = useState(() => defaultDate ?? new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("");
  const [advance, setAdvance] = useState("none");
  const [advanceTime, setAdvanceTime] = useState("");
  const [melody, setMelody] = useState<MelodyId>("classic");

  useEffect(() => {
    if (open) {
      setText(initial?.text ?? "");
      setPriority((initial?.priority as Priority) ?? "medium");
      setCategory(initial?.category ?? "Работа");
      setDate(initial?.date ?? defaultDate ?? new Date().toISOString().split("T")[0]);
      setTime(initial?.time ?? "");
      setAdvance(initial?.advance ?? "none");
      setAdvanceTime(initial?.advanceTime ?? "");
      setMelody((initial?.melody as MelodyId) ?? "classic");
    }
  }, [open, defaultDate, initial]);

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({ text: text.trim(), priority, category, date, time, advance, advanceTime, melody });
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Удалить задачу?")) {
      onDelete?.();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <h2 className="modal-title">{editMode ? "Редактировать задачу" : "Новая задача"}</h2>
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

        {/* Date + Time row */}
        <div className="modal-row-2">
          <div className="modal-field">
            <label className="modal-label">Дата</label>
            <input
              type="date"
              className="modal-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="modal-field">
            <label className="modal-label">
              <Icon name="Clock" size={13} />
              Время
            </label>
            <input
              type="time"
              className="modal-input"
              value={time}
              onChange={(e) => {
                const newTime = e.target.value;
                setTime(newTime);
                // Если время задано и уведомление не настроено — автоматом ставим «За 15 мин»
                if (newTime && advance === "none") {
                  setAdvance("За 15 мин");
                }
                // Если время очищено — сбрасываем заранее
                if (!newTime) {
                  setAdvance("none");
                  setAdvanceTime("");
                }
              }}
              placeholder="не задано"
            />
          </div>
        </div>

        {/* Priority */}
        <div className="modal-field">
          <label className="modal-label">Приоритет</label>
          <div className="priority-row">
            {priorityOptions.map((p) => (
              <button
                key={p.value}
                className={`priority-chip ${priority === p.value ? "priority-chip--active" : ""}`}
                style={priority === p.value
                  ? { borderColor: p.color, background: p.color, color: "#fff" }
                  : {}}
                onClick={() => setPriority(p.value)}
              >
                <span className="priority-dot" style={{ background: priority === p.value ? "rgba(255,255,255,0.7)" : p.color }} />
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

        {/* Advance notification — только если задано время */}
        {time && (
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
                />
                <span className="advance-custom-hint">Точное время напоминания в этот день</span>
              </div>
            )}
          </div>
        )}

        {/* Melody picker — только если задано время */}
        {time && (
          <div className="modal-field">
            <label className="modal-label">
              <Icon name="Music" size={13} />
              Мелодия уведомления
            </label>
            <div className="chip-row chip-row--wrap">
              {MELODY_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  className={`cat-chip melody-chip ${melody === m.id ? "cat-chip--active" : ""}`}
                  onClick={() => { setMelody(m.id); playMelody(m.id, false); }}
                  title="Нажми — прослушать"
                >
                  <Icon name={m.icon} size={12} />
                  {m.label}
                </button>
              ))}
            </div>
            <span className="advance-custom-hint">Нажми на мелодию — прослушать</span>
          </div>
        )}

        {!time && (
          <div className="modal-hint-notif">
            <Icon name="BellOff" size={13} />
            Укажите время — появится настройка уведомления
          </div>
        )}

        <button className="modal-save-btn" onClick={handleSave} disabled={!text.trim()}>
          {editMode ? "Сохранить изменения" : "Добавить задачу"}
        </button>

        {editMode && onDelete && (
          <button className="modal-delete-btn" onClick={handleDelete}>
            <Icon name="Trash2" size={15} />
            Удалить задачу
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskModal;