import { useState } from "react";
import HomePage from "@/components/pages/HomePage";
import TasksPage from "@/components/pages/TasksPage";
import CalendarPage from "@/components/pages/CalendarPage";
import RemindersPage from "@/components/pages/RemindersPage";
import SettingsPage from "@/components/pages/SettingsPage";
import BottomNav from "@/components/BottomNav";
import InstallBanner from "@/components/InstallBanner";

export type Page = "home" | "tasks" | "calendar" | "reminders" | "settings";

const Index = () => {
  const [activePage, setActivePage] = useState<Page>("home");

  const renderPage = () => {
    switch (activePage) {
      case "home": return <HomePage />;
      case "tasks": return <TasksPage />;
      case "calendar": return <CalendarPage />;
      case "reminders": return <RemindersPage />;
      case "settings": return <SettingsPage />;
    }
  };

  return (
    <div className="app-shell">
      <InstallBanner />
      <main className="main-content">
        {renderPage()}
      </main>
      <BottomNav activePage={activePage} onChange={setActivePage} />
    </div>
  );
};

export default Index;