"use client";

import { startTransition, useEffect, useState } from "react";

export type ViewPreference = "grid" | "calendar";

const STORAGE_KEY = "events-view-preference";

/**
 * Persists the user's preferred events view (grid vs calendar) in localStorage.
 * Defaults to "grid" on first visit or when localStorage is unavailable.
 */
export function useViewPreference(
  defaultView: ViewPreference = "grid",
): [ViewPreference, (v: ViewPreference) => void] {
  const [view, setView] = useState<ViewPreference>(defaultView);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "grid" || stored === "calendar") {
        startTransition(() => setView(stored));
      }
    } catch {
      // localStorage unavailable (e.g. private browsing with strict settings)
    }
  }, []);

  function setAndPersist(next: ViewPreference) {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write errors
    }
  }

  return [view, setAndPersist];
}
