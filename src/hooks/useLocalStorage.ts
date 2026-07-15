"use client";

import { useCallback, useSyncExternalStore } from "react";

type StoreEntry = {
  listeners: Set<() => void>;
  cachedRaw: string | null | undefined;
  cachedValue: unknown;
};

const stores = new Map<string, StoreEntry>();

function getStoreEntry(key: string): StoreEntry {
  let entry = stores.get(key);
  if (!entry) {
    entry = {
      listeners: new Set(),
      cachedRaw: undefined,
      cachedValue: undefined,
    };
    stores.set(key, entry);
  }
  return entry;
}

function readStorage<T>(key: string, initialValue: T): T {
  const entry = getStoreEntry(key);
  try {
    const raw = localStorage.getItem(key);
    if (entry.cachedRaw === raw) {
      return entry.cachedValue as T;
    }
    entry.cachedRaw = raw;
    entry.cachedValue =
      raw !== null ? (JSON.parse(raw) as T) : initialValue;
    return entry.cachedValue as T;
  } catch {
    entry.cachedRaw = null;
    entry.cachedValue = initialValue;
    return initialValue;
  }
}

function invalidateStore(key: string) {
  getStoreEntry(key).cachedRaw = undefined;
}

function notifyStore(key: string) {
  getStoreEntry(key).listeners.forEach((listener) => listener());
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const entry = getStoreEntry(key);
      entry.listeners.add(callback);

      const handler = (event: StorageEvent) => {
        if (event.key === key || event.key === null) {
          invalidateStore(key);
          callback();
        }
      };
      window.addEventListener("storage", handler);

      return () => {
        entry.listeners.delete(callback);
        window.removeEventListener("storage", handler);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(
    () => readStorage(key, initialValue),
    [key, initialValue],
  );

  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const current = readStorage(key, initialValue);
        const next = value instanceof Function ? value(current) : value;
        const raw = JSON.stringify(next);
        localStorage.setItem(key, raw);
        const entry = getStoreEntry(key);
        entry.cachedRaw = raw;
        entry.cachedValue = next;
        notifyStore(key);
      } catch {
        // localStorage can be blocked (private mode, storage quota, etc.)
      }
    },
    [key, initialValue],
  );

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      const entry = getStoreEntry(key);
      entry.cachedRaw = null;
      entry.cachedValue = initialValue;
      notifyStore(key);
    } catch {
      // localStorage can be blocked
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}
