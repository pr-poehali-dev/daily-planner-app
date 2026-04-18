import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ProfileModal from "@/components/ProfileModal";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface SettingToggle {
  id: string;
  label: string;
  description: string;
  icon: string;
  value: boolean;
}

interface Profile {
  name: string;
  email: string;
}

const initialToggles: SettingToggle[] = [
  { id: "notifications", label: "Уведомления", description: "Push-уведомления о задачах", icon: "Bell", value: true },
  { id: "sounds", label: "Звуки", description: "Звук при завершении задачи", icon: "Volume2", value: false },
  { id: "darkmode", label: "Тёмная тема", description: "Переключить на тёмный режим", icon: "Moon", value: false },
  { id: "weekstart", label: "Неделя с понедельника", description: "Начинать календарь с пн", icon: "CalendarDays", value: true },
];

const initialProfile: Profile = { name: "Алексей Иванов", email: "aleksey@example.com" };

const getInitials = (name: string) =>
  name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

const SettingsPage = () => {
  const [toggles, setToggles] = useLocalStorage("diary_settings", initialToggles);
  const [profile, setProfile] = useLocalStorage<Profile>("diary_profile", initialProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const { canInstall, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    if (!("Notification" in window)) { setNotifPermission("unsupported"); return; }
    setNotifPermission(Notification.permission);
  }, []);

  const notifEnabled = toggles.find((t) => t.id === "notifications")?.value ?? true;

  const toggle = (id: string) => {
    setToggles((prev) => prev.map((t) => t.id === id ? { ...t, value: !t.value } : t));
  };

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") {
      toggle("notifications");
      setTimeout(() => {
        new Notification("Ежедневник", { body: "Уведомления включены!", icon: "/favicon.svg" });
      }, 400);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Настройки</h1>
      </div>

      {/* Profile block */}
      <div className="profile-card">
        <div className="profile-avatar">{getInitials(profile.name)}</div>
        <div className="profile-info">
          <span className="profile-name">{profile.name}</span>
          <span className="profile-email">{profile.email}</span>
        </div>
        <button className="icon-btn" onClick={() => setEditOpen(true)}>
          <Icon name="Pencil" size={16} />
        </button>
      </div>

      {/* Toggles */}
      <div className="section">
        <h2 className="section-title">Предпочтения</h2>
        <div className="settings-list">
          {toggles.map((t) => {
            const isNotif = t.id === "notifications";
            const blocked = isNotif && notifPermission === "denied";
            const needsRequest = isNotif && notifPermission === "default";
            return (
              <div key={t.id} className="settings-row">
                <div className={`settings-icon-wrap ${isNotif && t.value && notifPermission === "granted" ? "settings-icon-wrap--green" : ""}`}>
                  <Icon name={t.icon} size={16} />
                </div>
                <div className="settings-info">
                  <span className="settings-label">{t.label}</span>
                  <span className="settings-desc">
                    {blocked
                      ? "Заблокировано в настройках браузера"
                      : needsRequest
                      ? "Нажмите для запроса разрешения"
                      : t.description}
                  </span>
                </div>
                {blocked ? (
                  <span className="settings-badge settings-badge--red">Блок</span>
                ) : needsRequest ? (
                  <button className="settings-request-btn" onClick={requestPermission}>
                    Разрешить
                  </button>
                ) : (
                  <button
                    className={`toggle-switch ${t.value ? "toggle-switch--on" : ""}`}
                    onClick={() => toggle(t.id)}
                  >
                    <span className="toggle-knob" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Статус уведомлений */}
        {notifPermission === "granted" && notifEnabled && (
          <div className="notif-status-card">
            <Icon name="BellRing" size={16} />
            <span>Уведомления активны — придут даже при заблокированном экране</span>
          </div>
        )}
        {notifPermission === "granted" && !notifEnabled && (
          <div className="notif-status-card notif-status-card--off">
            <Icon name="BellOff" size={16} />
            <span>Уведомления выключены в настройках</span>
          </div>
        )}
      </div>

      {/* Install */}
      <div className="section">
        <h2 className="section-title">Приложение</h2>
        <div className="settings-list">
          {isInstalled ? (
            <div className="settings-row">
              <div className="settings-icon-wrap settings-icon-wrap--green">
                <Icon name="CheckCircle" size={16} />
              </div>
              <div className="settings-info">
                <span className="settings-label">Приложение установлено</span>
                <span className="settings-desc">Работает как нативное приложение</span>
              </div>
            </div>
          ) : canInstall ? (
            <button className="settings-row settings-row--link" onClick={install}>
              <div className="settings-icon-wrap settings-icon-wrap--accent">
                <Icon name="Download" size={16} />
              </div>
              <div className="settings-info">
                <span className="settings-label">Установить на устройство</span>
                <span className="settings-desc">Добавить на главный экран, работает офлайн</span>
              </div>
              <Icon name="ChevronRight" size={16} />
            </button>
          ) : null}
          <a
            className="settings-row settings-row--link"
            href="/widget.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <div className="settings-icon-wrap" style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
              <Icon name="Smartphone" size={16} />
            </div>
            <div className="settings-info">
              <span className="settings-label">Виджет задач</span>
              <span className="settings-desc">Открыть виджет с задачами на сегодня</span>
            </div>
            <Icon name="ExternalLink" size={16} />
          </a>
        </div>
      </div>

      {/* Links */}
      <div className="section">
        <h2 className="section-title">Другое</h2>
        <div className="settings-list">
          {[
            { icon: "ShieldCheck", label: "Конфиденциальность" },
            { icon: "CircleHelp", label: "Помощь и поддержка" },
            { icon: "Info", label: "О приложении" },
          ].map((item) => (
            <div key={item.label} className="settings-row settings-row--link">
              <div className="settings-icon-wrap">
                <Icon name={item.icon} size={16} />
              </div>
              <span className="settings-label">{item.label}</span>
              <Icon name="ChevronRight" size={16} />
            </div>
          ))}
        </div>
      </div>

      <button className="logout-btn">
        <Icon name="LogOut" size={16} />
        Выйти из аккаунта
      </button>

      <ProfileModal
        open={editOpen}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSave={(p) => { setProfile(p); setEditOpen(false); }}
      />
    </div>
  );
};

export default SettingsPage;