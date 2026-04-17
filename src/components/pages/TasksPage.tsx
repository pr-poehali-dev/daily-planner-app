import { useState } from "react";
import Icon from "@/components/ui/icon";
import TaskModal, { type NewTask } from "@/components/TaskModal";
import SwipeRow from "@/components/SwipeRow";

type Priority = "high" | "medium" | "low";
type Filter = "all" | "active" | "done";

interface Task {
  id: number;
  text: string;
  done: boolean;
  priority: Priority;
  category: string;
  date: string;
}

const initialTasks: Task[] = [
  { id: 1, text: "Подготовить отчёт за квартал", done: true, priority: "high", category: "Работа", date: "2026-04-17" },
  { id: 2, text: "Созвон с командой в 15:00", done: false, priority: "high", category: "Работа", date: "2026-04-17" },
  { id: 3, text: "Обновить базу контактов", done: false, priority: "medium", category: "Работа", date: "2026-04-17" },
  { id: 4, text: "Купить продукты", done: false, priority: "low", category: "Личное", date: "2026-04-18" },
  { id: 5, text: "Записаться к врачу", done: false, priority: "medium", category: "Личное", date: "2026-04-18" },
  { id: 6, text: "Прочитать книгу", done: false, priority: "low", category: "Развитие", date: "2026-04-20" },
];

const priorityColors: Record<Priority, string> = {
  high: "priority--high",
  medium: "priority--medium",
  low: "priority--low",
};

const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

const TasksPage = () => {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const toggle = (id: number) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const remove = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addTask = (newTask: NewTask) => {
    setTasks((prev) => [...prev, {
      id: Date.now(),
      text: newTask.text,
      done: false,
      priority: newTask.priority,
      category: newTask.category,
      date: newTask.date,
    }]);
  };

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Задачи</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge-count">{doneCount}/{tasks.length}</span>
          <button className="icon-btn" onClick={() => setModalOpen(true)}>
            <Icon name="Plus" size={20} />
          </button>
        </div>
      </div>

      <div className="filter-tabs">
        {(["all", "active", "done"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-tab ${filter === f ? "filter-tab--active" : ""}`}
          >
            {f === "all" ? "Все" : f === "active" ? "Активные" : "Выполненные"}
          </button>
        ))}
      </div>

      <div className="task-list">
        {filtered.map((task) => (
          <SwipeRow
            key={task.id}
            onDelete={() => remove(task.id)}
            onClick={() => toggle(task.id)}
            className={`task-row-full ${task.done ? "task-row--done" : ""}`}
          >
            <div className={`task-check ${task.done ? "task-check--done" : ""}`}>
              {task.done && <Icon name="Check" size={12} />}
            </div>
            <div className="task-info">
              <span className="task-text">{task.text}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="task-category">{task.category}</span>
                <span className="task-category" style={{ opacity: 0.5 }}>·</span>
                <span className="task-category">{formatDate(task.date)}</span>
              </div>
            </div>
            <span className={`priority-dot ${priorityColors[task.priority]}`} />
          </SwipeRow>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">
            <Icon name="CheckCircle" size={32} />
            <p>Задач нет</p>
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setModalOpen(true)}>
        <Icon name="Plus" size={22} />
      </button>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addTask}
      />
    </div>
  );
};

export default TasksPage;
