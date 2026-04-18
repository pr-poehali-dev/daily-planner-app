/* Service Worker — Ежедневник */
const CHECK_INTERVAL = 60; // секунд

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

/* ── Слушаем сообщения от страницы ── */
self.addEventListener("message", (e) => {
  if (e.data?.type === "SCHEDULE_CHECKS") {
    startChecking();
  }
  if (e.data?.type === "SNOOZE") {
    snoozedTags.add(e.data.tag);
  }
  if (e.data?.type === "DISMISS") {
    dismissedTags.add(e.data.tag);
  }
});

/* ── Клик по уведомлению ── */
self.addEventListener("notificationclick", (e) => {
  const action = e.action;
  const tag = e.notification.tag;
  e.notification.close();

  if (action === "snooze") {
    // отложить на 5 минут
    const snoozeUntil = Date.now() + 5 * 60 * 1000;
    snoozed[tag] = snoozeUntil;
    broadcastSnooze(tag);
    return;
  }
  if (action === "dismiss") {
    dismissedTags.add(tag);
    // Останавливаем повтор
    if (repeatTimers[tag]) { clearInterval(repeatTimers[tag]); delete repeatTimers[tag]; }
    broadcastDismiss(tag);
    return;
  }

  // открыть приложение
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin)) {
          c.focus();
          return;
        }
      }
      self.clients.openWindow("/");
    })
  );
});

/* ── Состояние ── */
const snoozed = {};       // tag -> timestamp until (snooze)
const dismissedTags = new Set();
const repeatTimers = {};  // tag -> intervalId (повтор мелодии каждые 3 мин)
let checkTimer = null;

function broadcastToClients(msg) {
  self.clients.matchAll({ includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage(msg)));
}
function broadcastSnooze(tag) {
  broadcastToClients({ type: "SNOOZED", tag });
}
function broadcastDismiss(tag) {
  broadcastToClients({ type: "DISMISSED", tag });
}

function startChecking() {
  if (checkTimer) return;
  checkTimer = setInterval(checkNotifications, CHECK_INTERVAL * 1000);
  checkNotifications();
}

function pad(n) { return String(n).padStart(2, "0"); }

function getTodayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const ADVANCE_MINUTES = {
  "За 15 мин": 15,
  "За 1 час": 60,
  "За 3 часа": 180,
  "За 6 часов": 360,
  "За 1 день": 1440,
  "За 2 дня": 2880,
};

function getTaskFireTimes(task) {
  if (task.done || !task.date || !task.time) return [];
  const results = [];
  const base = new Date(task.date + "T" + task.time + ":00");
  if (isNaN(base.getTime())) return [];

  const timeKey = `${task.date}-${task.time}`;

  results.push({
    fireAt: base.getTime(),
    tag: `task-${task.id}-exact-${timeKey}`,
    title: "Ежедневник",
    body: `🔔 ${task.text}`,
  });

  const advMin = task.advance && task.advance !== "none" && task.advance !== "custom"
    ? (ADVANCE_MINUTES[task.advance] ?? 0) : 0;
  if (advMin > 0) {
    results.push({
      fireAt: base.getTime() - advMin * 60 * 1000,
      tag: `task-${task.id}-advance-${timeKey}-${task.advance}`,
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
      tag: `task-${task.id}-custom-${task.date}-${task.advanceTime}`,
      title: "Напоминание",
      body: `📌 ${task.text}`,
    });
  }

  return results;
}

function getReminderFireTime(r) {
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

/* ── IndexedDB helpers (работают без открытой вкладки) ── */
const DB_NAME = "diary-db";
const DB_VERSION = 1;

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("store")) {
        req.result.createObjectStore("store");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("store", "readonly");
    const req = tx.objectStore("store").get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readDiaryData() {
  // Сначала пробуем IDB (работает в фоне)
  try {
    const tasks = await idbGet("tasks") || [];
    const reminders = await idbGet("reminders") || [];
    const notificationsEnabled = await idbGet("notificationsEnabled") ?? true;
    if (tasks.length > 0 || reminders.length > 0) {
      return { tasks, reminders, notificationsEnabled };
    }
  } catch { /* fallback ниже */ }

  // Fallback: запросить у открытой вкладки через postMessage
  const clients = await self.clients.matchAll({ type: "window" });
  if (clients.length === 0) return null;

  const client = clients[0];
  const msgChannel = new MessageChannel();
  const data = await new Promise((resolve) => {
    msgChannel.port1.onmessage = (e) => resolve(e.data);
    client.postMessage({ type: "GET_DATA" }, [msgChannel.port2]);
    setTimeout(() => resolve(null), 2000);
  });
  return data;
}

async function checkNotifications() {
  const data = await readDiaryData();
  if (!data) return;

  const { tasks = [], reminders = [], notificationsEnabled = true } = data;
  if (!notificationsEnabled) return;

  const now = Date.now();
  const WINDOW = 90_000; // 90 сек окно срабатывания

  const fire = async (item) => {
    const { fireAt, tag, title, body } = item;
    if (dismissedTags.has(tag)) return;
    if (snoozed[tag] && Date.now() < snoozed[tag]) return;
    if (fireAt > now || now - fireAt > WINDOW) return;

    // Показываем уведомление с кнопками
    await self.registration.showNotification(title, {
      body,
      tag,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      actions: [
        { action: "dismiss", title: "🔕 Выключить" },
        { action: "snooze",  title: "⏱ Отложить 5 мин" },
      ],
    });

    // Просим страницу сыграть мелодию (если открыта)
    broadcastToClients({ type: "PLAY_ALARM", tag });

    // Запускаем повтор каждые 3 минуты если ещё не выключили
    if (!repeatTimers[tag]) {
      repeatTimers[tag] = setInterval(async () => {
        if (dismissedTags.has(tag)) {
          clearInterval(repeatTimers[tag]);
          delete repeatTimers[tag];
          return;
        }
        // Повтор: показываем уведомление снова и просим сыграть звук
        await self.registration.showNotification(title, {
          body,
          tag,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            { action: "dismiss", title: "🔕 Выключить" },
            { action: "snooze",  title: "⏱ Отложить 5 мин" },
          ],
        });
        broadcastToClients({ type: "PLAY_ALARM", tag });
      }, 3 * 60 * 1000);
    }
  };

  for (const task of tasks) {
    for (const ft of getTaskFireTimes(task)) await fire(ft);
  }
  for (const r of reminders) {
    const ft = getReminderFireTime(r);
    if (ft) await fire(ft);
  }
}