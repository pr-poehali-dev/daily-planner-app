import { useState, useRef, useCallback } from "react";
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
  melody?: string;
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
const priorityBg: Record<Priority, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
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
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const toggle = (id: number) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const remove = (id: number) => {
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

  const openModal = useCallback(() => {
    document.querySelector(".main-content")?.scrollTo({ top: 0 });
    setModalOpen(true);
  }, []);

  const openEdit = (id: number) => {
    setEditingId(id);
    document.querySelector(".main-content")?.scrollTo({ top: 0 });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const editingTask = editingId !== null ? tasks.find((t) => t.id === editingId) : undefined;

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
          <button className="icon-btn" onClick={openModal}>
            <Icon name="Plus" size={20} />
          </button>
        </div>
      </div>

      <div className="filter-tabs">
        {(["all", "active", "done"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setExpanded(false); }}
            className={`filter-tab ${filter === f ? "filter-tab--active" : ""}`}
          >
            {f === "all" ? "Все" : f === "active" ? "Активные" : "Выполненные"}
          </button>
        ))}
      </div>

      <div className="task-list">
        {(expanded ? sorted : sorted.slice(0, 1)).map((task) => (
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
              style={{ borderLeftColor: priorityBg[task.priority], borderLeftWidth: 3 }}
            >
              {sortMode === "manual" && (
                <div className="task-drag-handle">
                  <Icon name="GripVertical" size={16} />
                </div>
              )}
              <button
                className={`task-check ${task.done ? "task-check--done" : ""}`}
                onClick={(e) => { e.stopPropagation(); toggle(task.id); }}
                aria-label="Отметить"
              >
                {task.done && <Icon name="Check" size={12} />}
              </button>
              <div className="task-info" onClick={() => openEdit(task.id)}>
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
              <button
                className="task-action-btn"
                onClick={(e) => { e.stopPropagation(); openEdit(task.id); }}
                aria-label="Изменить"
              >
                <Icon name="Pencil" size={14} />
              </button>
              <button
                className="task-action-btn task-action-btn--danger"
                onClick={(e) => { e.stopPropagation(); if (confirm("Удалить задачу?")) remove(task.id); }}
                aria-label="Удалить"
              >
                <Icon name="Trash2" size={14} />
              </button>
              <span className={`priority-dot ${priorityColors[task.priority]}`} />
            </div>
          </div>
        ))}
        {sorted.length > 1 && (
          <button className="tasks-expand-btn" onClick={() => setExpanded((e) => !e)}>
            {expanded ? (
              <><Icon name="ChevronUp" size={14} />Свернуть</>
            ) : (
              <><Icon name="ChevronDown" size={14} />Ещё {sorted.length - 1} {sorted.length - 1 === 1 ? "задача" : sorted.length - 1 < 5 ? "задачи" : "задач"}</>
            )}
          </button>
        )}
        {sorted.length === 0 && (
          <div className="empty-state">
            <Icon name="CheckCircle" size={32} />
            <p>Задач нет</p>
          </div>
        )}
      </div>

      <button className="fab" onClick={openModal}>
        <Icon name="Plus" size={22} />
      </button>

      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        onSave={saveTask}
        initial={editingTask}
        editMode={!!editingTask}
        onDelete={editingTask ? () => remove(editingTask.id) : undefined}
      />
    </div>
  );
};

export default TasksPage;