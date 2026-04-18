import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import TaskModal, { type NewTask } from "@/components/TaskModal";
import { api, type Task, type Reminder } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import type { Page } from "@/pages/Index";

interface HomePageProps {
  onNavigate?: (page: Page) => void;
}

const today = new Date();
const dayNames = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

const priorityColors: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function getTodayIso() {
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

const HomePage = ({ onNavigate }: HomePageProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    api.getTasks().then(setTasks).catch(() => {});
    api.getReminders().then(setReminders).catch(() => {});
  }, []);

  const todayIso = getTodayIso();
  const todayTasks = tasks.filter((t) => t.date === todayIso);
  const doneCount = todayTasks.filter((t) => t.done).length;
  const progress = todayTasks.length ? Math.round((doneCount / todayTasks.length) * 100) : 0;
  const activeReminders = reminders.filter((r) => r.active).length;

  const getInitials = (name: string) =>
    name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const toggle = async (id: number) => {
    const t = tasks.find((t) => t.id === id);
    if (!t) return;
    const updated = { ...t, done: !t.done };
    setTasks((prev) => prev.map((x) => x.id === id ? updated : x));
    await api.updateTask(id, { done: updated.done }).catch(() => {});
  };

  const addTask = async (newTask: NewTask) => {
    const created = await api.createTask({
      text: newTask.text,
      priority: newTask.priority,
      category: newTask.category,
      date: newTask.date,
      time: newTask.time,
      advance: newTask.advance,
      advanceTime: newTask.advanceTime,
    }).catch(() => null);
    if (created) setTasks((prev) => [...prev, created]);
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="greeting-day">{dayNames[today.getDay()]}</p>
          <h1 className="greeting-date">
            {today.getDate()} {monthNames[today.getMonth()]}
          </h1>
        </div>
        <div className="avatar-circle">{user ? getInitials(user.name || user.email) : "?"}</div>
      </div>

      {/* Progress */}
      <div className="progress-card">
        <div className="progress-header">
          <span className="progress-label">Прогресс дня</span>
          <span className="progress-pct">{progress}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-sub">
          {todayTasks.length === 0
            ? "Задач на сегодня нет"
            : `${doneCount} из ${todayTasks.length} задач выполнено`}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <button className="stat-card" onClick={() => onNavigate?.("tasks")}>
          <Icon name="CheckSquare" size={18} />
          <span className="stat-value">{todayTasks.length}</span>
          <span className="stat-label">Задач сегодня</span>
        </button>
        <button className="stat-card" onClick={() => onNavigate?.("tasks")}>
          <Icon name="CheckCircle" size={18} />
          <span className="stat-value">{doneCount}</span>
          <span className="stat-label">Выполнено</span>
        </button>
        <button className="stat-card" onClick={() => onNavigate?.("reminders")}>
          <Icon name="Bell" size={18} />
          <span className="stat-value">{activeReminders}</span>
          <span className="stat-label">Напоминаний</span>
        </button>
      </div>

      {/* Tasks today */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">На сегодня</h2>
          <button className="home-add-btn" onClick={() => setModalOpen(true)}>
            <Icon name="Plus" size={15} />
            Добавить
          </button>
        </div>

        <div className="home-task-list">
          {todayTasks.length === 0 ? (
            <div className="home-empty" onClick={() => setModalOpen(true)}>
              <Icon name="Plus" size={20} />
              <span>Добавить первую задачу на сегодня</span>
            </div>
          ) : (
            <>
              {(expanded ? todayTasks : todayTasks.slice(0, 1)).map((task) => (
                <div
                  key={task.id}
                  className={`home-task-row ${task.done ? "home-task-row--done" : ""}`}
                  onClick={() => toggle(task.id)}
                >
                  <span
                    className="home-task-priority"
                    style={{ background: priorityColors[task.priority] }}
                  />
                  <div className={`home-task-check ${task.done ? "home-task-check--done" : ""}`}>
                    {task.done && <Icon name="Check" size={10} />}
                  </div>
                  <span className="home-task-text">{task.text}</span>
                  {task.time && (
                    <span className="home-task-time">
                      <Icon name="Clock" size={10} />
                      {task.time}
                    </span>
                  )}
                </div>
              ))}

              {/* Кнопка раскрытия если задач больше одной */}
              {todayTasks.length > 1 && (
                <button
                  className="home-task-expand"
                  onClick={() => setExpanded((e) => !e)}
                >
                  {expanded ? (
                    <>
                      <Icon name="ChevronUp" size={13} />
                      Свернуть
                    </>
                  ) : (
                    <>
                      <Icon name="ChevronDown" size={13} />
                      Ещё {todayTasks.length - 1} {todayTasks.length - 1 === 1 ? "задача" : todayTasks.length - 1 < 5 ? "задачи" : "задач"}
                    </>
                  )}
                </button>
              )}

              <button className="home-task-add" onClick={() => setModalOpen(true)}>
                <Icon name="Plus" size={13} />
                Добавить
              </button>
            </>
          )}
        </div>
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addTask}
        defaultDate={todayIso}
      />
    </div>
  );
};

export default HomePage;