import type { Lesson } from './types';

const DB_NAME = 'bebris-cards';
const DB_VERSION = 1;
const STORE = 'lessons';
const LS_MIGRATE_KEY = 'bebris-cards-v1';

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);

    req.onsuccess = () => {
      _db = req.result;
      _db.onversionchange = () => {
        _db?.close();
        _db = null;
      };
      resolve(_db);
    };

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function loadData(): Promise<Lesson[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const APOS = /[\u2018\u2019\u201A\u201B\u02BC]/g;
      const QUOT = /[\u201C\u201D\u201E\u201F]/g;
      const normalize = (s: string) =>
        s.replace(APOS, "'").replace(QUOT, '"').replace(/\s+/g, ' ').trim();
      const lessons = (req.result as Lesson[]).map(l => ({
        ...l,
        items: l.items.map(i => ({
          ...i,
          type: i.type === ('phrase' as string) ? 'word' as const : i.type,
          original: normalize(i.original),
          translation: normalize(i.translation),
        })),
      }));
      resolve(lessons);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveData(lessons: Lesson[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    for (const lesson of lessons) {
      store.put(lesson);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Переносит данные из старого localStorage при первом запуске
export async function migrateFromLocalStorage(): Promise<void> {
  const raw = localStorage.getItem(LS_MIGRATE_KEY);
  if (!raw) return;
  try {
    const lessons = JSON.parse(raw) as Lesson[];
    if (lessons.length > 0) {
      await saveData(lessons);
    }
    localStorage.removeItem(LS_MIGRATE_KEY);
  } catch {
    // не критично — просто пропускаем миграцию
  }
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
