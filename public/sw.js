/* ── Service Worker — Ежедневник ── */

const CRON_URL = "https://functions.poehali.dev/b9e8fd82-350a-4c3b-b8d0-1a214e46f2f4";
let cronTimer = null;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
  startCron();
});

/* ── Фоновый cron прямо в SW: работает пока браузер запущен (вкладка закрыта — ок) ── */
function startCron() {
  if (cronTimer) return;
  setTimeout(() => {
    pingScheduler();
    cronTimer = setInterval(pingScheduler, 60_000);
  }, 3000);
}

function pingScheduler() {
  fetch(CRON_URL, { method: "GET" }).catch(() => {});
}

/* ── Получаем push с сервера (браузер полностью закрыт — ОС будит SW) ── */
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let data = { title: "Ежедневник", body: "Напоминание о задаче", tag: "push-" + Date.now() };
    try { if (e.data) data = { ...data, ...JSON.parse(e.data.text()) }; } catch {}

    await self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      actions: [
        { action: "snooze", title: "⏱ Отложить 5 мин" },
        { action: "dismiss", title: "✓ Выключить" },
      ],
      data,
    });

    // Если вкладка открыта — просим сыграть звук
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ type: "PLAY_ALARM", tag: data.tag }));
  })());
});

/* ── Клик по уведомлению ── */
self.addEventListener("notificationclick", (e) => {
  const action = e.action;
  const tag = e.notification.tag;
  e.notification.close();

  if (action === "snooze") {
    self.clients.matchAll({ type: "window" }).then((cs) =>
      cs.forEach((c) => c.postMessage({ type: "SNOOZED", tag }))
    );
    return;
  }

  if (action === "dismiss") {
    self.clients.matchAll({ type: "window" }).then((cs) =>
      cs.forEach((c) => c.postMessage({ type: "DISMISSED", tag }))
    );
    return;
  }

  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) { c.focus(); return; }
      self.clients.openWindow("/");
    })
  );
});
