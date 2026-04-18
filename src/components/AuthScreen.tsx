import { useState } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string) => Promise<void>;
}

const AuthScreen = ({ onLogin, onRegister }: Props) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Заполни все поля"); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        await onLogin(email.trim(), password);
      } else {
        if (!name.trim()) { setError("Введи имя"); setLoading(false); return; }
        await onRegister(email.trim(), password, name.trim());
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <Icon name="CalendarDays" size={32} />
        </div>
        <h1 className="auth-title">Ежедневник</h1>
        <p className="auth-sub">Личный планировщик задач</p>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "auth-tab--active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Вход
          </button>
          <button
            className={`auth-tab ${mode === "register" ? "auth-tab--active" : ""}`}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Регистрация
          </button>
        </div>

        {/* Fields */}
        <div className="auth-fields">
          {mode === "register" && (
            <div className="auth-field">
              <label className="auth-label">Имя</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Как тебя зовут?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Пароль</label>
            <input
              className="auth-input"
              type="password"
              placeholder={mode === "register" ? "Минимум 6 символов" : "Введи пароль"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>

        {error && (
          <div className="auth-error">
            <Icon name="AlertCircle" size={14} />
            {error}
          </div>
        )}

        <button className="auth-btn" onClick={submit} disabled={loading}>
          {loading ? (
            <span className="auth-spinner" />
          ) : (
            mode === "login" ? "Войти" : "Создать аккаунт"
          )}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
