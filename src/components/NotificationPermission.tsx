import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const NotificationPermission = () => {
  const [status, setStatus] = useState<NotificationPermission | "unsupported">("default");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission);
  }, []);

  const request = async () => {
    const result = await Notification.requestPermission();
    setStatus(result);
    if (result === "granted") {
      setTimeout(() => {
        new Notification("Ежедневник", {
          body: "Уведомления включены! Теперь задачи будут напоминать о себе вовремя.",
          icon: "/favicon.svg",
        });
      }, 500);
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
        <span className="notif-banner-sub">Уведомляю о задачах вовремя — даже со звуком</span>
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
