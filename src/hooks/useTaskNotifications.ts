import { useEffect, useRef } from "react";

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
  date: string;
  repeat: string;
  active: boolean;
  advance: string;
}

const ADVANCE_MINUTES: Record<string, number> = {
  "За 15 мин": 15,
  "За 1 час": 60,
  "За 3 часа": 180,
  "За 6 часов": 360,
  "За 1 день": 1440,
  "За 2 дня": 2880,
};

// VAPID публичный ключ
const VAPID_PUBLIC = "BEhRYiBSAvY2_muohII_hUHLNgaB4EOxH4xxvbPSIgpoP9Uoc6K9Kidas2Ct3J5G6worZnWycDHDXHzZLQ4lvmA";

// Backend URLs
const SUBSCRIBE_URL = "https://functions.poehali.dev/54b522c7-94bc-4ba7-87f0-54081021a5da";
const SYNC_URL = "https://functions.poehali.dev/4833118a-55ec-4b57-8daa-e244ba1e752d";

/* ── Громкая мелодия ── */
export function playAlarm(repeat = false) {
  try {
    const AudioCtx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();

    const tone = (t: number, freq: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.04);
      gain.gain.linearRampToValueAtTime(vol * 0.8, t + dur - 0.04);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t);
      osc.stop(t + dur);
    };

    const now = ctx.currentTime;
    tone(now + 0.00, 523, 0.18, 1.0); // C5
    tone(now + 0.22, 659, 0.18, 1.0); // E5
    tone(now + 0.44, 784, 0.22, 1.0); // G5
    tone(now + 0.70, 1047, 0.35, 1.0); // C6

    if (repeat) setTimeout(() => playAlarm(false), 1800);
  } catch { /* AudioContext недоступен */ }
}

/* ── Уведомление через браузер ── */
function sendNotification(title: string, body: string, tag: string, onDismiss?: (tag: string) => void) {
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body, tag,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
    } as NotificationOptions);
    n.onclick = () => { n.close(); onDismiss?.(tag); };
    n.onclose = () => onDismiss?.(tag);
  } catch { /* fallback */ }
  playAlarm(true);
}

/* ── Получить user_key (уникальный ID устройства) ── */
function getUserKey(): string {
  let key = localStorage.getItem("diary_user_key");
  if (!key) {
    key = "u-" + Math.random().toString(36).slice(2) + "-" + Date.now();
    localStorage.setItem("diary_user_key", key);
  }
  return key;
}

/* ── URL-base64 → Uint8Array для VAPID ── */
function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

/* ── Подписка на Web Push ── */
async function subscribePush(reg: ServiceWorkerRegistration) {
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC),
      });
    }

    const tzOffsetMin = -new Date().getTimezoneOffset();
    const token = localStorage.getItem("diary_token") || "";
    await fetch(SUBSCRIBE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        user_key: getUserKey(),
        subscription: { ...sub.toJSON(), tz_offset_min: tzOffsetMin },
      }),
    });
  } catch { /* подписка недоступна или сеть недоступна */ }
}

/* ── Синхронизация задач на сервер (вызывается при изменении) ── */
export async function syncTasksToServer() {
  try {
    const tasks: Task[] = JSON.parse(localStorage.getItem("diary_tasks") || "[]");
    const reminders: Reminder[] = JSON.parse(localStorage.getItem("diary_reminders") || "[]");
    await fetch(SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_key: getUserKey(), tasks, reminders }),
    });
  } catch { /* нет сети */ }
}

/* ── Время срабатывания задачи ── */
function getTaskFireTimes(task: Task) {
  if (task.done || !task.date || !task.time) return [];
  const results: { fireAt: number; tag: string; title: string; body: string }[] = [];
  const base = new Date(task.date + "T" + task.time + ":00");
  if (isNaN(base.getTime())) return [];

  results.push({ fireAt: base.getTime(), tag: `task-${task.id}-exact`, title: "Ежедневник", body: `🔔 ${task.text}` });

  const adv = task.advance;
  const advMin = adv && adv !== "none" && adv !== "custom" ? ADVANCE_MINUTES[adv] ?? 0 : 0;
  if (advMin > 0) results.push({
    fireAt: base.getTime() - advMin * 60_000,
    tag: `task-${task.id}-advance`,
    title: "Напоминание",
    body: `⏰ ${advMin < 60 ? advMin + " мин" : advMin / 60 + " ч"} до: ${task.text}`,
  });

  if (adv === "custom" && task.advanceTime) {
    const [ch, cm] = task.advanceTime.split(":").map(Number);
    const custom = new Date(task.date + "T00:00:00");
    custom.setHours(ch, cm, 0, 0);
    results.push({ fireAt: custom.getTime(), tag: `task-${task.id}-custom`, title: "Напоминание", body: `📌 ${task.text}` });
  }

  return results;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function getTodayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

function getReminderFireTime(r: Reminder) {
  if (!r.active || !r.time) return null;
  const [h, m] = r.time.split(":").map(Number);
  const base = new Date();
  base.setHours(h, m, 0, 0);
  if (base.getTime() < Date.now()) base.setDate(base.getDate() + 1);
  return { fireAt: base.getTime(), tag: `reminder-${r.id}-${getTodayIso()}`, title: "Напоминание", body: `🔔 ${r.title} · ${r.time}` };
}

/* ── Главный хук ── */
export function useTaskNotifications() {
  const firedRef = useRef<Set<string>>(new Set());
  const repeatsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        swRegRef.current = reg;

        // Слушаем события от SW
        navigator.serviceWorker.addEventListener("message", (e) => {
          if (e.data?.type === "PLAY_ALARM") playAlarm(true);
          if (e.data?.type === "DISMISSED") {
            const tag = e.data.tag;
            firedRef.current.add(tag + "-dismissed");
            const iv = repeatsRef.current[tag];
            if (iv) { clearInterval(iv); delete repeatsRef.current[tag]; }
          }
        });

        // Подписываемся на серверные пуши если разрешение есть
        if (Notification.permission === "granted") {
          await subscribePush(reg);
        }
      })
      .catch(() => {});
  }, []);

  // Перенодписываться когда дано разрешение
  useEffect(() => {
    const checkAndSubscribe = async () => {
      if (Notification.permission === "granted" && swRegRef.current) {
        await subscribePush(swRegRef.current);
      }
    };
    const id = setInterval(checkAndSubscribe, 5000);
    return () => clearInterval(id);
  }, []);

  // Локальная проверка (резерв пока браузер открыт)
  useEffect(() => {
    const dismiss = (tag: string) => {
      firedRef.current.add(tag + "-dismissed");
      const iv = repeatsRef.current[tag];
      if (iv) { clearInterval(iv); delete repeatsRef.current[tag]; }
    };

    const fire = (item: { fireAt: number; tag: string; title: string; body: string }) => {
      const { tag, title, body } = item;
      if (firedRef.current.has(tag + "-dismissed") || firedRef.current.has(tag)) return;
      firedRef.current.add(tag);
      sendNotification(title, body, tag, dismiss);

      // Повтор каждые 3 минуты пока не выключат
      const iv = setInterval(() => {
        if (firedRef.current.has(tag + "-dismissed")) { clearInterval(iv); delete repeatsRef.current[tag]; return; }
        sendNotification(title, body + " (повтор)", tag + "-r-" + Date.now(), dismiss);
      }, 3 * 60_000);
      repeatsRef.current[tag] = iv;
    };

    const tick = () => {
      const settings = JSON.parse(localStorage.getItem("diary_settings") || "[]");
      const on = settings.find((s: { id: string }) => s.id === "notifications")?.value ?? true;
      if (!on || Notification.permission !== "granted") return;

      const now = Date.now();
      const WINDOW = 90_000;
      const tasks: Task[] = JSON.parse(localStorage.getItem("diary_tasks") || "[]");
      const reminders: Reminder[] = JSON.parse(localStorage.getItem("diary_reminders") || "[]");

      for (const task of tasks)
        for (const ft of getTaskFireTimes(task))
          if (ft.fireAt <= now && now - ft.fireAt < WINDOW) fire(ft);

      for (const r of reminders) {
        const ft = getReminderFireTime(r);
        if (ft && ft.fireAt <= now && now - ft.fireAt < WINDOW) fire(ft);
      }
    };

    tick();
    const iv = setInterval(tick, 15_000);
    return () => { clearInterval(iv); Object.values(repeatsRef.current).forEach(clearInterval); };
  }, []);
}