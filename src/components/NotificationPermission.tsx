import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { syncTasksToServer } from "@/hooks/useTaskNotifications";

const VAPID_PUBLIC = "BEhRYiBSAvY2_muohII_hUHLNgaB4EOxH4xxvbPSIgpoP9Uoc6K9Kidas2Ct3J5G6worZnWycDHDXHzZLQ4lvmA";
const SUBSCRIBE_URL = "https://functions.poehali.dev/54b522c7-94bc-4ba7-87f0-54081021a5da";

function urlB64ToUint8Array(b64: string) {
  const pad = "=".repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

async function doSubscribe() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const userKey = localStorage.getItem("diary_user_key") ||
      (() => { const k = "u-" + Math.random().toString(36).slice(2); localStorage.setItem("diary_user_key", k); return k; })();
    const tzOffsetMin = -new Date().getTimezoneOffset();
    const token = localStorage.getItem("diary_token") || "";
    const subJson = { ...sub.toJSON(), tz_offset_min: tzOffsetMin };
    await fetch(SUBSCRIBE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify({ user_key: userKey, subscription: subJson }),
    });
    console.log("[Push] подписка отправлена на сервер");
  } catch (e) {
    console.warn("[Push] ошибка подписки", e);
  }
}

const NotificationPermission = () => {
  const [status, setStatus] = useState<NotificationPermission | "unsupported">("default");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) { setStatus("unsupported"); return; }
    setStatus(Notification.permission);
    // Если уже разрешено — сразу подписываемся
    if (Notification.permission === "granted") doSubscribe();
  }, []);

  const request = async () => {
    const result = await Notification.requestPermission();
    setStatus(result);
    if (result === "granted") {
      await doSubscribe();
      await syncTasksToServer();
      setTimeout(() => {
        new Notification("Ежедневник", {
          body: "Уведомления включены! Буду напоминать о задачах даже при закрытом приложении.",
          icon: "/favicon.svg",
        });
      }, 600);
    }
  };

  if (dismissed || status === "granted" || status === "denied" || status === "unsupported") return null;

  return (
    <div className="notif-banner">
      <div className="notif-banner-icon">
        <Icon name="Bell" size={20} />
      </div>
      <div className="notif-banner-text">
        <span className="notif-banner-title">Включить напоминания</span>
        <span className="notif-banner-sub">Приходят даже при закрытом приложении</span>
      </div>
      <button className="notif-banner-btn" onClick={request}>
        Включить
      </button>
      <button className="notif-banner-close" onClick={() => setDismissed(true)}>
        <Icon name="X" size={16} />
      </button>
    </div>
  );
};

export default NotificationPermission;