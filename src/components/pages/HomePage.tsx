import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import TaskModal, { type NewTask } from "@/components/TaskModal";

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
}

interface Reminder {
  id: number;
  title: string;
  time: string;
  active: boolean;
}

const initialTasks: Task[] = [
  { id: 1, text: "Подготовить отчёт за квартал", done: true, priority: "high", category: "Работа", date: getTodayIso() },
  { id: 2, text: "Созвон с командой в 15:00", done: false, priority: "high", category: "Работа", date: getTodayIso() },
  { id: 3, text: "Обновить базу контактов", done: false, priority: "medium", category: "Работа", date: getTodayIso() },
  { id: 4, text: "Купить продукты", done: false, priority: "low", category: "Личное", date: getTodayIso() },
];

const HomePage = () => {
  const [tasks, setTasks] = useLocalStorage<Task[]>("diary_tasks", initialTasks);
  const [reminders] = useLocalStorage<Reminder[]>("diary_reminders", []);
  const [modalOpen, setModalOpen] = useState(false);
  const [profile] = useLocalStorage<{ name: string }>("diary_profile", { name: "Алексей" });

  const todayIso = getTodayIso();
  const todayTasks = tasks.filter((t) => t.date === todayIso);
  const doneCount = todayTasks.filter((t) => t.done).length;
  const progress = todayTasks.length ? Math.round((doneCount / todayTasks.length) * 100) : 0;
  const activeReminders = reminders.filter((r) => r.active).length;

  const getInitials = (name: string) =>
    name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const toggle = (id: number) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTask = (newTask: NewTask) => {
    setTasks((prev) => [...prev, {
      id: Date.now(),
      text: newTask.text,
      done: false,
      priority: newTask.priority,
      category: newTask.category,
      date: newTask.date,
      time: newTask.time,
      advance: newTask.advance,
      advanceTime: newTask.advanceTime,
    }]);
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
        <div className="avatar-circle">{getInitials(profile.name)}</div>
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
        <div className="stat-card">
          <Icon name="CheckSquare" size={18} />
          <span className="stat-value">{todayTasks.length}</span>
          <span className="stat-label">Задач сегодня</span>
        </div>
        <div className="stat-card">
          <Icon name="CheckCircle" size={18} />
          <span className="stat-value">{doneCount}</span>
          <span className="stat-label">Выполнено</span>
        </div>
        <div className="stat-card">
          <Icon name="Bell" size={18} />
          <span className="stat-value">{activeReminders}</span>
          <span className="stat-label">Напоминаний</span>
        </div>
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

        <div className="task-list">
          {todayTasks.length === 0 ? (
            <div className="home-empty" onClick={() => setModalOpen(true)}>
              <Icon name="Plus" size={22} />
              <span>Добавить первую задачу на сегодня</span>
            </div>
          ) : (
            todayTasks.map((task) => (
              <div
                key={task.id}
                className={`task-row ${task.done ? "task-row--done" : ""}`}
                onClick={() => toggle(task.id)}
              >
                <div className={`task-check ${task.done ? "task-check--done" : ""}`}>
                  {task.done && <Icon name="Check" size={12} />}
                </div>
                <div className="task-info">
                  <span className="task-text">{task.text}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span
                      className="cal-task-dot"
                      style={{ background: priorityColors[task.priority], width: 6, height: 6 }}
                    />
                    <span className="task-category">{task.category}</span>
                    {task.time && (
                      <span className="task-time-badge">
                        <Icon name="Clock" size={10} />
                        {task.time}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {todayTasks.length > 0 && (
          <button className="home-add-inline" onClick={() => setModalOpen(true)}>
            <Icon name="Plus" size={14} />
            Добавить задачу
          </button>
        )}
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
