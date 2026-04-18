import { useState, useEffect, useCallback } from "react";
import HomePage from "@/components/pages/HomePage";
import TasksPage from "@/components/pages/TasksPage";
import CalendarPage from "@/components/pages/CalendarPage";
import RemindersPage from "@/components/pages/RemindersPage";
import SettingsPage from "@/components/pages/SettingsPage";
import BottomNav from "@/components/BottomNav";
import InstallBanner from "@/components/InstallBanner";
import NotificationPermission from "@/components/NotificationPermission";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";

export type Page = "home" | "tasks" | "calendar" | "reminders" | "settings";

const Index = () => {
  const [activePage, setActivePage] = useState<Page>("home");
  const [exitPrompt, setExitPrompt] = useState(false);
  useTaskNotifications();

  // Пушим state в History при каждой смене страницы
  const navigateTo = useCallback((page: Page) => {
    if (page === activePage) return;
    // Пушим текущую страницу в стек чтобы "назад" вернул на неё
    window.history.pushState({ page }, "", "");
    setActivePage(page);
    setExitPrompt(false);
  }, [activePage]);

  // При первом рендере — гарантируем что в стеке есть запись
  useEffect(() => {
    window.history.replaceState({ page: "home" }, "", "");
  }, []);

  // Слушаем кнопку Назад
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const prevPage = (e.state as { page?: Page } | null)?.page;

      if (activePage !== "home") {
        // Есть куда возвращаться — идём на главную
        setActivePage("home");
        setExitPrompt(false);
        // Вернём state чтобы следующее нажатие Назад снова сработало
        window.history.pushState({ page: "home" }, "", "");
      } else {
        // Уже на главной — показываем плашку выхода
        setExitPrompt(true);
        // Кладём state обратно чтобы следующее нажатие мы снова поймали
        window.history.pushState({ page: "home" }, "", "");
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [activePage]);

  // Скрываем плашку по таймауту (4 сек)
  useEffect(() => {
    if (!exitPrompt) return;
    const t = setTimeout(() => setExitPrompt(false), 4000);
    return () => clearTimeout(t);
  }, [exitPrompt]);

  const renderPage = () => {
    switch (activePage) {
      case "home": return <HomePage onNavigate={navigateTo} />;
      case "tasks": return <TasksPage />;
      case "calendar": return <CalendarPage />;
      case "reminders": return <RemindersPage />;
      case "settings": return <SettingsPage />;
    }
  };

  return (
    <div className="app-shell">
      <NotificationPermission />
      <InstallBanner />
      <main className="main-content">
        {renderPage()}
      </main>
      <BottomNav activePage={activePage} onChange={navigateTo} />

      {/* Плашка подтверждения выхода */}
      {exitPrompt && (
        <div className="exit-prompt">
          <span className="exit-prompt__text">Выйти из приложения?</span>
          <div className="exit-prompt__actions">
            <button
              className="exit-prompt__btn exit-prompt__btn--cancel"
              onClick={() => setExitPrompt(false)}
            >
              Отмена
            </button>
            <button
              className="exit-prompt__btn exit-prompt__btn--confirm"
              onClick={() => window.history.go(-20)}
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;