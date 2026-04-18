import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import TaskModal, { type NewTask } from "@/components/TaskModal";
import { api, type Task } from "@/hooks/useApi";

const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const dayLabelsShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const priorityColors: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(toIso(now.getFullYear(), now.getMonth(), now.getDate()));
  const [dayExpanded, setDayExpanded] = useState(false);

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

  useEffect(() => {
    api.getTasks().then(setTasks).catch(() => {});
  }, []);

  const addTask = async (newTask: NewTask) => {
    const created = await api.createTask({
      text: newTask.text,
      priority: newTask.priority,
      category: newTask.category,
      date: modalDate,
      time: newTask.time,
      advance: newTask.advance,
      advanceTime: newTask.advanceTime,
      melody: newTask.melody,
    }).catch(() => null);
    if (created) setTasks((prev) => [...prev, created]);
  };

  const toggleTask = async (id: number) => {
    const t = tasks.find((t) => t.id === id);
    if (!t) return;
    const updated = { ...t, done: !t.done };
    setTasks((prev) => prev.map((x) => x.id === id ? updated : x));
    await api.updateTask(id, { done: updated.done }).catch(() => {});
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

  const selectedIso = toIso(year, month, selected);
  const selectedTasks = tasksByDate(selectedIso);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Календарь</h1>
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

      {/* Day labels */}
      <div className="cal-grid-header">
        {dayLabels.map((d) => <span key={d} className="cal-day-label">{d}</span>)}
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
                    return (
                      <button
                        key={di}
                        className={`cal-cell ${isSelected ? "cal-cell--selected" : ""} ${isToday && !isSelected ? "cal-cell--today" : ""}`}
                        onClick={() => { setSelected(day); setDayExpanded(false); }}
                      >
                        {day}
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

              {/* Expanded week: task list by day */}
              {isExpanded && (
                <div className="cal-week-detail">
                  {week.map((day, di) => {
                    if (!day) return null;
                    const iso = toIso(year, month, day);
                    const dayTasks = tasksByDate(iso);
                    const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                    return (
                      <div key={di} className={`cal-day-row ${isToday ? "cal-day-row--today" : ""}`}>
                        <div className="cal-day-label-full">
                          <span className="cal-day-name">{dayLabelsShort[di]}</span>
                          <span className={`cal-day-num ${isToday ? "cal-day-num--today" : ""}`}>{day}</span>
                        </div>
                        <div className="cal-day-tasks">
                          {dayTasks.map((t) => (
                            <div
                              key={t.id}
                              className={`cal-task-chip ${t.done ? "cal-task-chip--done" : ""}`}
                              onClick={() => toggleTask(t.id)}
                            >
                              <span
                                className="cal-task-dot"
                                style={{ background: priorityColors[t.priority] }}
                              />
                              <span className="cal-task-text">{t.text}</span>
                              {t.done && <Icon name="Check" size={11} />}
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
          <div className="compact-task-list">
            {(dayExpanded ? selectedTasks : selectedTasks.slice(0, 1)).map((t) => (
              <div
                key={t.id}
                className={`compact-task-row ${t.done ? "compact-task-row--done" : ""}`}
                onClick={() => toggleTask(t.id)}
              >
                <span className="compact-priority-bar" style={{ background: priorityColors[t.priority] }} />
                <div className={`compact-check ${t.done ? "compact-check--done" : ""}`}>
                  {t.done && <Icon name="Check" size={10} />}
                </div>
                <div className="compact-task-info">
                  <span className="compact-task-text">{t.text}</span>
                  <span className="compact-meta-item">{t.category}</span>
                </div>
                <div className={`cal-event-check ${t.done ? "cal-event-check--done" : ""}`}>
                  {t.done && <Icon name="Check" size={11} />}
                </div>
              </div>
            ))}

            {selectedTasks.length > 1 && (
              <button className="compact-expand-btn" onClick={() => setDayExpanded(e => !e)}>
                {dayExpanded ? (
                  <><Icon name="ChevronUp" size={13} />Свернуть</>
                ) : (
                  <><Icon name="ChevronDown" size={13} />Ещё {selectedTasks.length - 1} {selectedTasks.length - 1 === 1 ? "задача" : selectedTasks.length - 1 < 5 ? "задачи" : "задач"}</>
                )}
              </button>
            )}

            <button className="compact-add-btn" onClick={() => openAddForDate(selectedIso)}>
              <Icon name="Plus" size={13} />
              Добавить
            </button>
          </div>
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addTask}
        defaultDate={modalDate}
      />
    </div>
  );
};

export default CalendarPage;