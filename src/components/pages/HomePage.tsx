import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import TaskModal, { type NewTask } from "@/components/TaskModal";
import type { Page } from "@/pages/Index";
import type { MelodyId } from "@/utils/melodies";

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

const priorityLabel: Record<string, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
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
  melody?: MelodyId;
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

const HomePage = ({ onNavigate }: HomePageProps) => {
  const [tasks, setTasks] = useLocalStorage<Task[]>("diary_tasks", initialTasks);
  const [reminders] = useLocalStorage<Reminder[]>("diary_reminders", []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
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

  const removeTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const saveTask = (data: NewTask) => {
    if (editingId !== null) {
      setTasks((prev) => prev.map((t) => t.id === editingId ? { ...t, ...data } : t));
      setEditingId(null);
    } else {
      setTasks((prev) => [...prev, { id: Date.now(), done: false, ...data }]);
    }
  };

  const openEdit = (id: number) => {
    setPreviewTask(null);
    setEditingId(id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const editingTask = editingId !== null ? tasks.find((t) => t.id === editingId) : undefined;

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
            (expanded ? todayTasks : todayTasks.slice(0, 1)).map((task) => (
              <div
                key={task.id}
                className={`home-task-row ${task.done ? "home-task-row--done" : ""}`}
              >
                <span
                  className="home-task-priority"
                  style={{ background: priorityColors[task.priority] }}
                />
                <button
                  className={`home-task-check ${task.done ? "home-task-check--done" : ""}`}
                  onClick={(e) => { e.stopPropagation(); toggle(task.id); }}
                  aria-label="Отметить"
                >
                  {task.done && <Icon name="Check" size={10} />}
                </button>
                <span className="home-task-text" onClick={() => setPreviewTask(task)}>{task.text}</span>
                {task.time && (
                  <span className="home-task-time" onClick={() => setPreviewTask(task)}>
                    <Icon name="Clock" size={10} />
                    {task.time}
                  </span>
                )}
                <button
                  className="task-action-btn"
                  onClick={(e) => { e.stopPropagation(); openEdit(task.id); }}
                  aria-label="Изменить"
                >
                  <Icon name="Pencil" size={13} />
                </button>
                <button
                  className="task-action-btn task-action-btn--danger"
                  onClick={(e) => { e.stopPropagation(); if (confirm("Удалить задачу?")) removeTask(task.id); }}
                  aria-label="Удалить"
                >
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            ))
          )}
          {todayTasks.length > 1 && (
            <button className="home-task-expand" onClick={() => setExpanded((e) => !e)}>
              {expanded ? (
                <><Icon name="ChevronUp" size={13} />Свернуть</>
              ) : (
                <><Icon name="ChevronDown" size={13} />Ещё {todayTasks.length - 1} {todayTasks.length - 1 === 1 ? "задача" : todayTasks.length - 1 < 5 ? "задачи" : "задач"}</>
              )}
            </button>
          )}
          {todayTasks.length > 0 && (
            <button className="home-task-add" onClick={() => setModalOpen(true)}>
              <Icon name="Plus" size={13} />
              Добавить
            </button>
          )}
        </div>
      </div>

      {/* Всплывающее окно задачи */}
      {previewTask && (
        <div className="task-preview-overlay" onClick={() => setPreviewTask(null)}>
          <div className="task-preview-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="task-preview-handle" />
            <div className="task-preview-header">
              <span
                className="task-preview-priority-badge"
                style={{ background: priorityColors[previewTask.priority] }}
              >
                {priorityLabel[previewTask.priority]}
              </span>
              <button className="task-preview-close" onClick={() => setPreviewTask(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>
            <p className="task-preview-text">{previewTask.text}</p>
            <div className="task-preview-meta">
              {previewTask.time && (
                <span className="task-preview-meta-item">
                  <Icon name="Clock" size={14} />
                  {previewTask.time}
                </span>
              )}
              <span className="task-preview-meta-item">
                <Icon name="Tag" size={14} />
                {previewTask.category}
              </span>
              <span className={`task-preview-status ${previewTask.done ? "task-preview-status--done" : ""}`}>
                {previewTask.done ? "Выполнено" : "В работе"}
              </span>
            </div>
            <div className="task-preview-actions">
              <button
                className={`task-preview-btn ${previewTask.done ? "task-preview-btn--undo" : "task-preview-btn--done"}`}
                onClick={() => { toggle(previewTask.id); setPreviewTask(null); }}
              >
                <Icon name={previewTask.done ? "RotateCcw" : "Check"} size={15} />
                {previewTask.done ? "Вернуть в работу" : "Отметить выполненной"}
              </button>
              <button
                className="task-preview-btn task-preview-btn--edit"
                onClick={() => openEdit(previewTask.id)}
              >
                <Icon name="Pencil" size={15} />
                Редактировать
              </button>
            </div>
          </div>
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        onSave={saveTask}
        defaultDate={todayIso}
        initial={editingTask}
        editMode={!!editingTask}
        onDelete={editingTask ? () => removeTask(editingTask.id) : undefined}
      />
    </div>
  );
};

export default HomePage;