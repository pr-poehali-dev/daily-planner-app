import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import TaskModal, { type NewTask } from "@/components/TaskModal";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Priority = "high" | "medium" | "low";
type Filter = "all" | "active" | "done";
type SortMode = "manual" | "priority";

interface Task {
  id: number;
  text: string;
  done: boolean;
  priority: Priority;
  category: string;
  date: string;
  time?: string;
  advance?: string;
  advanceTime?: string;
}

const initialTasks: Task[] = [
  { id: 1, text: "Подготовить отчёт за квартал", done: true, priority: "high", category: "Работа", date: "2026-04-17" },
  { id: 2, text: "Созвон с командой в 15:00", done: false, priority: "high", category: "Работа", date: "2026-04-17" },
  { id: 3, text: "Обновить базу контактов", done: false, priority: "medium", category: "Работа", date: "2026-04-17" },
  { id: 4, text: "Купить продукты", done: false, priority: "low", category: "Личное", date: "2026-04-18" },
  { id: 5, text: "Записаться к врачу", done: false, priority: "medium", category: "Личное", date: "2026-04-18" },
  { id: 6, text: "Прочитать книгу", done: false, priority: "low", category: "Развитие", date: "2026-04-20" },
];

const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const priorityColors: Record<Priority, string> = {
  high: "priority--high",
  medium: "priority--medium",
  low: "priority--low",
};
const priorityLabel: Record<Priority, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

const TasksPage = () => {
  const [tasks, setTasks] = useLocalStorage("diary_tasks", initialTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [modalOpen, setModalOpen] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

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
      time: newTask.time,
      advance: newTask.advance,
      advanceTime: newTask.advanceTime,
    }]);
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    dragNode.current = e.currentTarget as HTMLDivElement;
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = "0.4"; }, 0);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
    if (dragNode.current) dragNode.current.style.opacity = "1";
    dragNode.current = null;
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (id !== dragId) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (dragId === null || dragId === targetId) return;
    setTasks((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((t) => t.id === dragId);
      const toIdx = arr.findIndex((t) => t.id === targetId);
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
    setDragId(null);
    setDragOverId(null);
  };

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const sorted = sortMode === "priority"
    ? [...filtered].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    : filtered;

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Задачи</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className={`sort-toggle ${sortMode === "priority" ? "sort-toggle--active" : ""}`}
            onClick={() => setSortMode((s) => s === "manual" ? "priority" : "manual")}
            title={sortMode === "priority" ? "Сортировка по важности" : "Ручной порядок"}
          >
            <Icon name={sortMode === "priority" ? "ArrowUpNarrowWide" : "GripVertical"} size={16} />
            <span>{sortMode === "priority" ? "По важности" : "Вручную"}</span>
          </button>
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
        {sorted.map((task) => (
          <div
            key={task.id}
            className={`task-drag-wrap ${dragOverId === task.id ? "task-drag-wrap--over" : ""}`}
            draggable={sortMode === "manual"}
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, task.id)}
            onDrop={(e) => handleDrop(e, task.id)}
          >
            <div
              className={`task-row-full ${task.done ? "task-row--done" : ""}`}
              onClick={() => toggle(task.id)}
            >
              {sortMode === "manual" && (
                <div className="task-drag-handle">
                  <Icon name="GripVertical" size={16} />
                </div>
              )}
              <div className={`task-check ${task.done ? "task-check--done" : ""}`}>
                {task.done && <Icon name="Check" size={12} />}
              </div>
              <div className="task-info">
                <span className="task-text">{task.text}</span>
                <div className="task-meta-row">
                  <span className={`priority-badge priority-badge--${task.priority}`}>
                    {priorityLabel[task.priority]}
                  </span>
                  <span className="task-category">{task.category}</span>
                  <span className="task-category" style={{ opacity: 0.4 }}>·</span>
                  <span className="task-category">{formatDate(task.date)}</span>
                  {task.time && (
                    <span className="task-time-badge">
                      <Icon name="Clock" size={10} />
                      {task.time}
                    </span>
                  )}
                  {task.advance && task.advance !== "none" && task.time && (
                    <span className="task-advance">
                      <Icon name="Bell" size={10} />
                      {task.advance === "custom" ? task.advanceTime : task.advance}
                    </span>
                  )}
                </div>
              </div>
              <span className={`priority-dot ${priorityColors[task.priority]}`} />
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
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