import { useState, useEffect } from "react";
import { api, type User } from "./useApi";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("diary_token");
    if (!token) { setLoading(false); return; }
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => { localStorage.removeItem("diary_token"); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    localStorage.setItem("diary_token", token);
    setUser(user);
  };

  const register = async (email: string, password: string, name: string) => {
    const { token, user } = await api.register(email, password, name);
    localStorage.setItem("diary_token", token);
    setUser(user);
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    localStorage.removeItem("diary_token");
    setUser(null);
  };

  return { user, loading, login, register, logout };
}
