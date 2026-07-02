"use client";

import { useCallback, useSyncExternalStore } from "react";

// Read and parse from localStorage, returning initialValue on any failure.
function readStorage<T>(key: string, initialValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? (JSON.parse(item) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Only subscribe to events for this specific key (or a full clear: key === null)
  const subscribe = useCallback(
    (callback: () => void) => {
      const handler = (event: StorageEvent) => {
        if (event.key === key || event.key === null) {
          callback();
        }
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key],
  );

  const storedValue = useSyncExternalStore(
    subscribe,
    () => readStorage(key, initialValue), // client snapshot
    () => initialValue, // server snapshot — safe default for SSR
  );

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const next = value instanceof Function ? value(storedValue) : value;
        localStorage.setItem(key, JSON.stringify(next));
        // Dispatch a storage event so same-tab subscribers also update.
        // The native "storage" event only fires in OTHER tabs.
        window.dispatchEvent(new StorageEvent("storage", { key }));
      } catch {
        // localStorage can be blocked (private mode, storage quota, etc.)
      }
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      window.dispatchEvent(new StorageEvent("storage", { key }));
    } catch {
      // localStorage can be blocked
    }
  }, [key]);

  return [storedValue, setValue, removeValue] as const;
}
