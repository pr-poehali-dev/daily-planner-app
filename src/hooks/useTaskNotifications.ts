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

/* ── Громкий звук с нарастанием ── */
function playAlarm(repeat = false) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();

    const playTone = (startTime: number, freq: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(vol * 0.7, startTime + dur - 0.05);
      gain.gain.linearRampToValueAtTime(0, startTime + dur);
      osc.start(startTime);
      osc.stop(startTime + dur);
    };

    // Мелодия: три нарастающих тона
    const now = ctx.currentTime;
    playTone(now + 0.0, 523, 0.2, 0.9);  // C5
    playTone(now + 0.25, 659, 0.2, 0.9); // E5
    playTone(now + 0.50, 784, 0.35, 1.0); // G5
    playTone(now + 0.90, 1047, 0.4, 1.0); // C6

    if (repeat) {
      setTimeout(() => playAlarm(false), 1800);
    }
  } catch {
    // AudioContext недоступен
  }
}

/* ── Отправка уведомления с кнопкой «Выключить» ── */
function sendNotification(
  title: string,
  body: string,
  tag: string,
  onDismiss?: (tag: string) => void
) {
  if (Notification.permission !== "granted") return;

  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      // actions поддерживаются только в SW-уведомлениях, поэтому
      // здесь используем click для dismiss
    } as NotificationOptions);

    n.onclick = () => { n.close(); onDismiss?.(tag); };
    n.onclose = () => onDismiss?.(tag);
  } catch {
    // fallback
  }

  playAlarm(true);
}

/* ── Время срабатывания задачи ── */
function getTaskFireTimes(task: Task) {
  if (task.done || !task.date || !task.time) return [];
  const results: { fireAt: number; tag: string; title: string; body: string }[] = [];

  const base = new Date(task.date + "T" + task.time + ":00");
  if (isNaN(base.getTime())) return [];

  results.push({
    fireAt: base.getTime(),
    tag: `task-${task.id}-exact`,
    title: "Ежедневник",
    body: `🔔 ${task.text}`,
  });

  const advMin = task.advance && task.advance !== "none" && task.advance !== "custom"
    ? ADVANCE_MINUTES[task.advance] ?? 0 : 0;

  if (advMin > 0) {
    results.push({
      fireAt: base.getTime() - advMin * 60 * 1000,
      tag: `task-${task.id}-advance`,
      title: "Напоминание",
      body: `⏰ ${advMin < 60 ? advMin + " мин" : advMin / 60 + " ч"} до: ${task.text}`,
    });
  }

  if (task.advance === "custom" && task.advanceTime) {
    const [ch, cm] = task.advanceTime.split(":").map(Number);
    const custom = new Date(task.date + "T00:00:00");
    custom.setHours(ch, cm, 0, 0);
    results.push({
      fireAt: custom.getTime(),
      tag: `task-${task.id}-custom`,
      title: "Напоминание",
      body: `📌 ${task.text}`,
    });
  }

  return results;
}

/* ── Время срабатывания напоминания ── */
function pad(n: number) { return String(n).padStart(2, "0"); }
function getTodayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function getReminderFireTime(r: Reminder) {
  if (!r.active || !r.time) return null;
  const [h, m] = r.time.split(":").map(Number);
  const base = new Date();
  base.setHours(h, m, 0, 0);
  if (base.getTime() < Date.now()) base.setDate(base.getDate() + 1);
  return {
    fireAt: base.getTime(),
    tag: `reminder-${r.id}-${getTodayIso()}`,
    title: "Напоминание",
    body: `🔔 ${r.title} · ${r.time}`,
  };
}

/* ── Регистрация Service Worker ── */
type DismissCallback = (tag: string) => void;
 
let _swDismissCallback: DismissCallback | null = null;

function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
    // Слушаем сообщения от SW
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "GET_DATA") {
        const port = e.ports[0];
        const tasks = JSON.parse(localStorage.getItem("diary_tasks") || "[]");
        const reminders = JSON.parse(localStorage.getItem("diary_reminders") || "[]");
        const settings = JSON.parse(localStorage.getItem("diary_settings") || "[]");
        const notificationsEnabled = settings.find((s: { id: string }) => s.id === "notifications")?.value ?? true;
        port.postMessage({ tasks, reminders, notificationsEnabled });
      }
      // SW просит сыграть мелодию (при срабатывании уведомления)
      if (e.data?.type === "PLAY_ALARM") {
        playAlarm(false);
      }
      // SW сообщает что нажали «Выключить» — останавливаем звук и повтор
      if (e.data?.type === "DISMISSED") {
        _swDismissCallback?.(e.data.tag);
      }
    });

    // Запускаем проверку в SW
    reg.active?.postMessage({ type: "SCHEDULE_CHECKS" });
    reg.installing?.addEventListener("statechange", function () {
      if (this.state === "activated") this.postMessage({ type: "SCHEDULE_CHECKS" });
    });
  }).catch(() => {});
}

/* ── Главный хук ── */
export function useTaskNotifications() {
  const firedRef = useRef<Set<string>>(new Set());
  const snoozedRef = useRef<Record<string, number>>({});
  const repeatsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    registerSW();
  }, []);

  useEffect(() => {
    // Функция dismiss — останавливает звук и повтор по тегу
    const dismiss = (tag: string) => {
      // Ищем корневой тег (убираем суффикс -r-...)
      const rootTag = tag.replace(/-r-\d+$/, "");
      firedRef.current.add(rootTag + "-dismissed");
      const interval = repeatsRef.current[rootTag];
      if (interval) { clearInterval(interval); delete repeatsRef.current[rootTag]; }
    };

    // Регистрируем callback чтобы SW мог вызвать dismiss
    _swDismissCallback = dismiss;

    const fire = (item: { fireAt: number; tag: string; title: string; body: string }) => {
      const { tag, title, body } = item;
      if (firedRef.current.has(tag + "-dismissed")) return;
      if (firedRef.current.has(tag)) return;

      firedRef.current.add(tag);
      sendNotification(title, body, tag, dismiss);

      // Повторять каждые 3 минуты пока не выключат (нажмут в уведомлении или тапнут на баннер)
      const interval = setInterval(() => {
        if (firedRef.current.has(tag + "-dismissed")) {
          clearInterval(interval);
          delete repeatsRef.current[tag];
          return;
        }
        sendNotification(title, body, tag + "-r-" + Date.now(), dismiss);
      }, 3 * 60 * 1000);

      repeatsRef.current[tag] = interval;
    };

    const tick = () => {
      const settings = JSON.parse(localStorage.getItem("diary_settings") || "[]");
      const notifOn = settings.find((s: { id: string }) => s.id === "notifications")?.value ?? true;
      if (!notifOn || Notification.permission !== "granted") return;

      const now = Date.now();
      const WINDOW = 90_000; // 90 сек

      const tasks: Task[] = JSON.parse(localStorage.getItem("diary_tasks") || "[]");
      const reminders: Reminder[] = JSON.parse(localStorage.getItem("diary_reminders") || "[]");

      for (const task of tasks) {
        for (const ft of getTaskFireTimes(task)) {
          if (ft.fireAt <= now && now - ft.fireAt < WINDOW) fire(ft);
        }
      }

      for (const r of reminders) {
        const ft = getReminderFireTime(r);
        if (ft && ft.fireAt <= now && now - ft.fireAt < WINDOW) fire(ft);
      }
    };

    tick();
    const interval = setInterval(tick, 15_000);
    return () => {
      clearInterval(interval);
      Object.values(repeatsRef.current).forEach(clearInterval);
    };
  }, []);
}