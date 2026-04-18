import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import TaskModal, { type NewTask } from "@/components/TaskModal";

const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const dayLabelsShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface Task {
  id: number;
  text: string;
  done: boolean;
  priority: "high" | "medium" | "low";
  category: string;
  date: string;
  time?: string;
  advance?: string;
  advanceTime?: string;
  melody?: string;
}

const priorityColors: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

// Выходные: Сб=5, Вс=6 (0-indexed в неделе Пн..Вс)
const isWeekend = (di: number) => di === 5 || di === 6;

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const toIso = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const CalendarPage = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(now.getDate());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [tasks, setTasks] = useLocalStorage<Task[]>("diary_tasks", []);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(toIso(now.getFullYear(), now.getMonth(), now.getDate()));
  const [editingId, setEditingId] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const tasksByDate = (iso: string) => tasks.filter((t) => t.date === iso);

  const openAddForDate = (iso: string) => {
    setModalDate(iso);
    setModalOpen(true);
  };

  const saveTask = (data: NewTask) => {
    if (editingId !== null) {
      setTasks((prev) => prev.map((t) => t.id === editingId ? { ...t, ...data } : t));
      setEditingId(null);
    } else {
      setTasks((prev) => [...prev, { id: Date.now(), done: false, ...data, date: modalDate }]);
    }
  };

  const removeTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const openEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const editingTask = editingId !== null ? tasks.find((t) => t.id === editingId) : undefined;

  const toggleTask = (id: number) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const allCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (allCells.length % 7 !== 0) allCells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < allCells.length; i += 7) {
    weeks.push(allCells.slice(i, i + 7));
  }

  const weekKey = (weekIdx: number) => `${year}-${month}-${weekIdx}`;

  const toggleWeek = (weekIdx: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekKey(weekIdx))) next.delete(weekKey(weekIdx));
      else next.add(weekKey(weekIdx));
      return next;
    });
  };

  const toggleAllWeeks = () => {
    if (allExpanded) {
      setExpandedWeeks(new Set());
      setAllExpanded(false);
    } else {
      const allKeys = weeks.map((_, wi) => weekKey(wi));
      setExpandedWeeks(new Set(allKeys));
      setAllExpanded(true);
    }
  };

  const selectedIso = toIso(year, month, selected);
  const selectedTasks = tasksByDate(selectedIso);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Календарь</h1>
        <button className="cal-collapse-btn" onClick={toggleAllWeeks}>
          <Icon name={allExpanded ? "ChevronsUp" : "ChevronsDown"} size={16} />
          {allExpanded ? "Свернуть" : "Все задачи"}
        </button>
      </div>

      {/* Month navigation */}
      <div className="month-nav">
        <button className="month-arrow" onClick={prevMonth}>
          <Icon name="ChevronLeft" size={18} />
        </button>
        <span className="month-label">{monthNames[month]} {year}</span>
        <button className="month-arrow" onClick={nextMonth}>
          <Icon name="ChevronRight" size={18} />
        </button>
      </div>

      {/* Day labels — Пн..Пт обычные, Сб/Вс зелёные */}
      <div className="cal-grid-header">
        {dayLabels.map((d, i) => (
          <span key={d} className={`cal-day-label ${isWeekend(i) ? "cal-day-label--weekend" : ""}`}>{d}</span>
        ))}
      </div>

      {/* Weeks */}
      <div className="cal-weeks">
        {weeks.map((week, wi) => {
          const isExpanded = expandedWeeks.has(weekKey(wi));
          const weekHasTasks = week.some((day) => {
            if (!day) return false;
            return tasksByDate(toIso(year, month, day)).length > 0;
          });

          return (
            <div key={wi} className="cal-week-block">
              {/* Week row */}
              <div className="cal-week-row">
                <div className="cal-week-days">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="cal-cell cal-cell--empty" />;
                    const iso = toIso(year, month, day);
                    const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                    const isSelected = day === selected;
                    const dayTasks = tasksByDate(iso);
                    const weekend = isWeekend(di);
                    return (
                      <button
                        key={di}
                        className={`cal-cell ${isSelected ? "cal-cell--selected" : ""} ${isToday && !isSelected ? "cal-cell--today" : ""} ${weekend && !isSelected ? "cal-cell--weekend" : ""}`}
                        onClick={() => { setSelected(day); }}
                      >
                        <span className="cal-cell-num">{day}</span>
                        {dayTasks.length > 0 && <span className="cal-dot" />}
                      </button>
                    );
                  })}
                </div>
                <button
                  className={`cal-week-expand ${isExpanded ? "cal-week-expand--open" : ""}`}
                  onClick={() => toggleWeek(wi)}
                  title={isExpanded ? "Свернуть неделю" : "Развернуть неделю"}
                >
                  <Icon name="ChevronDown" size={14} />
                  {weekHasTasks && !isExpanded && <span className="cal-week-dot" />}
                </button>
              </div>

              {/* Expanded week: task list by day — все задачи раскрыты */}
              {isExpanded && (
                <div className="cal-week-detail">
                  {week.map((day, di) => {
                    if (!day) return null;
                    const iso = toIso(year, month, day);
                    const dayTasks = tasksByDate(iso);
                    const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                    const weekend = isWeekend(di);
                    return (
                      <div key={di} className={`cal-day-row ${isToday ? "cal-day-row--today" : ""}`}>
                        <div className={`cal-day-label-full ${weekend ? "cal-day-label-full--weekend" : ""}`}>
                          <span className="cal-day-name">{dayLabelsShort[di]}</span>
                          <span className={`cal-day-num ${isToday ? "cal-day-num--today" : ""}`}>{day}</span>
                        </div>
                        <div className="cal-day-tasks">
                          {dayTasks.map((t) => (
                            <div
                              key={t.id}
                              className={`cal-task-chip ${t.done ? "cal-task-chip--done" : ""}`}
                            >
                              {/* Галочка СЛЕВА */}
                              <button
                                className="cal-task-chip-done"
                                onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }}
                                aria-label="Отметить"
                              >
                                {t.done
                                  ? <Icon name="CheckCircle2" size={14} />
                                  : <Icon name="Circle" size={14} />
                                }
                              </button>
                              <span
                                className="cal-task-dot"
                                style={{ background: priorityColors[t.priority] }}
                              />
                              <span className="cal-task-text" onClick={() => openEdit(t.id)}>{t.text}</span>
                              {t.time && (
                                <span className="cal-task-time">{t.time}</span>
                              )}
                            </div>
                          ))}
                          <button
                            className="cal-day-add-btn"
                            onClick={() => openAddForDate(iso)}
                          >
                            <Icon name="Plus" size={12} />
                            <span>Добавить</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day tasks */}
      <div className="section" style={{ marginTop: 8 }}>
        <div className="section-header">
          <h2 className="section-title">
            {selected} {monthNames[month]}
          </h2>
          <button
            className="cal-add-day-btn"
            onClick={() => openAddForDate(selectedIso)}
          >
            <Icon name="Plus" size={16} />
            Задача
          </button>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="cal-empty-day" onClick={() => openAddForDate(selectedIso)}>
            <Icon name="Plus" size={20} />
            <span>Добавить задачу на этот день</span>
          </div>
        ) : (
          <div className="cal-day-task-list">
            {selectedTasks.map((t) => (
              <div key={t.id} className={`cal-day-task-item ${t.done ? "cal-day-task-item--done" : ""}`}>
                {/* Галочка СЛЕВА */}
                <button
                  className={`task-check ${t.done ? "task-check--done" : ""}`}
                  onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }}
                  aria-label="Отметить"
                >
                  {t.done && <Icon name="Check" size={12} />}
                </button>
                <span
                  className="home-task-priority"
                  style={{ background: priorityColors[t.priority] }}
                />
                <div className="task-info" onClick={() => openEdit(t.id)}>
                  <span className="task-text">{t.text}</span>
                  {t.time && (
                    <span className="task-time-badge">
                      <Icon name="Clock" size={10} />
                      {t.time}
                    </span>
                  )}
                </div>
                <button
                  className="task-action-btn"
                  onClick={(e) => { e.stopPropagation(); openEdit(t.id); }}
                  aria-label="Изменить"
                >
                  <Icon name="Pencil" size={13} />
                </button>
                <button
                  className="task-action-btn task-action-btn--danger"
                  onClick={(e) => { e.stopPropagation(); if (confirm("Удалить задачу?")) removeTask(t.id); }}
                  aria-label="Удалить"
                >
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        onSave={saveTask}
        defaultDate={modalDate}
        initial={editingTask}
        editMode={!!editingTask}
        onDelete={editingTask ? () => { removeTask(editingTask.id); closeModal(); } : undefined}
      />
    </div>
  );
};

export default CalendarPage;
