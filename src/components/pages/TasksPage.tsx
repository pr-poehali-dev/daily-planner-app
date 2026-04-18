import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import TaskModal, { type NewTask } from "@/components/TaskModal";
import { api, type Task } from "@/hooks/useApi";

type Priority = "high" | "medium" | "low";
type Filter = "all" | "active" | "done";
type SortMode = "manual" | "priority";

const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const priorityColors: Record<Priority, string> = { high: "priority--high", medium: "priority--medium", low: "priority--low" };
const priorityLabel: Record<Priority, string> = { high: "Высокий", medium: "Средний", low: "Низкий" };

const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [modalOpen, setModalOpen] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const dragNode = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.getTasks()
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const updated = { ...task, done: !task.done };
    setTasks((prev) => prev.map((t) => t.id === id ? updated : t));
    await api.updateTask(id, { done: updated.done }).catch(() => {});
  };

  const remove = async (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await api.deleteTask(id).catch(() => {});
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

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    dragNode.current = e.currentTarget as HTMLDivElement;
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = "0.4"; }, 0);
  };

  const handleDragEnd = () => {
    setDragId(null); setDragOverId(null);
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
    setDragId(null); setDragOverId(null);
  };

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const sorted = sortMode === "priority"
    ? [...filtered].sort((a, b) => priorityOrder[a.priority as Priority] - priorityOrder[b.priority as Priority])
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
          <button key={f} onClick={() => { setFilter(f); setExpanded(false); }} className={`filter-tab ${filter === f ? "filter-tab--active" : ""}`}>
            {f === "all" ? "Все" : f === "active" ? "Активные" : "Выполненные"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><span className="auth-spinner auth-spinner--lg" /></div>
      ) : sorted.length === 0 ? (
        <div className="empty-state"><Icon name="CheckCircle" size={32} /><p>Задач нет</p></div>
      ) : (
        <div className="compact-task-list">
          {/* Первая задача — всегда видна */}
          {(expanded ? sorted : sorted.slice(0, 1)).map((task, idx) => (
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
                className={`compact-task-row ${task.done ? "compact-task-row--done" : ""} ${idx === 0 && !expanded ? "compact-task-row--first" : ""}`}
                onClick={() => toggle(task.id)}
              >
                {sortMode === "manual" && <div className="task-drag-handle"><Icon name="GripVertical" size={14} /></div>}
                <span className="compact-priority-bar" style={{ background: task.priority === "high" ? "#ef4444" : task.priority === "medium" ? "#f59e0b" : "#10b981" }} />
                <div className={`compact-check ${task.done ? "compact-check--done" : ""}`}>
                  {task.done && <Icon name="Check" size={10} />}
                </div>
                <div className="compact-task-info">
                  <span className="compact-task-text">{task.text}</span>
                  <div className="compact-task-meta">
                    <span className="compact-meta-item">{task.category}</span>
                    <span className="compact-meta-dot">·</span>
                    <span className="compact-meta-item">{formatDate(task.date)}</span>
                    {task.time && <span className="compact-meta-item compact-meta-time"><Icon name="Clock" size={9} />{task.time}</span>}
                  </div>
                </div>
                <span className={`priority-dot ${priorityColors[task.priority as Priority]}`} />
              </div>
            </div>
          ))}

          {/* Кнопка раскрытия */}
          {sorted.length > 1 && (
            <button className="compact-expand-btn" onClick={() => setExpanded(e => !e)}>
              {expanded ? (
                <><Icon name="ChevronUp" size={13} />Свернуть</>
              ) : (
                <><Icon name="ChevronDown" size={13} />Ещё {sorted.length - 1} {sorted.length - 1 === 1 ? "задача" : sorted.length - 1 < 5 ? "задачи" : "задач"}</>
              )}
            </button>
          )}
        </div>
      )}

      <button className="fab" onClick={() => setModalOpen(true)}>
        <Icon name="Plus" size={22} />
      </button>

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={addTask} />
    </div>
  );
};

export default TasksPage;