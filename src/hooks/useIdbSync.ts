/**
 * Синхронизирует задачи и напоминания в IndexedDB
 * чтобы Service Worker мог читать их без открытой вкладки
 */

const DB_NAME = "diary-db";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("store")) {
        db.createObjectStore("store");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("store", "readwrite");
    tx.objectStore("store").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("store", "readonly");
    const req = tx.objectStore("store").get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Вызывай при каждом изменении задач/напоминаний/настроек
 * чтобы SW мог читать актуальные данные в фоне
 */
export function syncToIdb() {
  try {
    const tasks = JSON.parse(localStorage.getItem("diary_tasks") || "[]");
    const reminders = JSON.parse(localStorage.getItem("diary_reminders") || "[]");
    const settings = JSON.parse(localStorage.getItem("diary_settings") || "[]");
    const notificationsEnabled = settings.find((s: { id: string }) => s.id === "notifications")?.value ?? true;

    idbSet("tasks", tasks).catch(() => {});
    idbSet("reminders", reminders).catch(() => {});
    idbSet("notificationsEnabled", notificationsEnabled).catch(() => {});
  } catch {
    // ignore
  }
}
