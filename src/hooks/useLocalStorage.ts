import { useState } from "react";
import { syncToIdb } from "./useIdbSync";

const IDB_KEYS = ["diary_tasks", "diary_reminders", "diary_settings"];

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      localStorage.setItem(key, JSON.stringify(resolved));
      // Синхронизируем в IDB чтобы SW мог читать данные в фоне
      if (IDB_KEYS.includes(key)) syncToIdb();
      return resolved;
    });
  };

  return [value, set] as const;
}