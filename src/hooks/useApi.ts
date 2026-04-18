const BASE = "https://functions.poehali.dev/dcc878f2-f248-404c-94a6-23500e3a75e2";

function url(route: string) {
  return `${BASE}/?route=${route}`;
}

function getToken() {
  return localStorage.getItem("diary_token") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Authorization": `Bearer ${getToken()}`,
  };
}

const SCHEDULER_PING_URL = "https://functions.poehali.dev/f10f6f28-103a-4d40-971a-14fa18ae6672";

function pingScheduler() {
  fetch(SCHEDULER_PING_URL, { method: "GET", cache: "no-store" }).catch(() => {});
}

async function req<T>(method: string, route: string, body?: unknown): Promise<T> {
  const res = await fetch(url(route), {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  // Если изменилась задача/напоминание — сразу пингуем scheduler
  if (method !== "GET" && (route.includes("tasks") || route.includes("reminders"))) {
    pingScheduler();
  }
  return data as T;
}

export const api = {
  // Auth
  register: (email: string, password: string, name: string) =>
    req<{ token: string; user: User }>("POST", "register", { email, password, name }),
  login: (email: string, password: string) =>
    req<{ token: string; user: User }>("POST", "login", { email, password }),
  logout: () => req<{ ok: boolean }>("POST", "logout"),
  me: () => req<{ user: User }>("GET", "me"),

  // Tasks
  getTasks: () => req<Task[]>("GET", "tasks"),
  createTask: (task: Partial<Task>) => req<Task>("POST", "tasks", task),
  updateTask: (id: number, data: Partial<Task>) => req<Task>("PUT", `tasks/${id}`, data),
  deleteTask: (id: number) => req<{ ok: boolean }>("DELETE", `tasks/${id}`),

  // Reminders
  getReminders: () => req<Reminder[]>("GET", "reminders"),
  createReminder: (r: Partial<Reminder>) => req<Reminder>("POST", "reminders", r),
  updateReminder: (id: number, data: Partial<Reminder>) => req<Reminder>("PUT", `reminders/${id}`, data),
  deleteReminder: (id: number) => req<{ ok: boolean }>("DELETE", `reminders/${id}`),
};

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Task {
  id: number;
  text: string;
  done: boolean;
  priority: "high" | "medium" | "low";
  category: string;
  date: string;
  time: string;
  advance: string;
  advanceTime: string;
  melody?: string;
}

export interface Reminder {
  id: number;
  title: string;
  time: string;
  date: string;
  repeat: string;
  active: boolean;
  icon: string;
  advance: string;
}