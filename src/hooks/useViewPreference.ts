"use client";

import { startTransition, useEffect, useState } from "react";

export type ViewPreference = "grid" | "calendar";

const STORAGE_KEY = "events-view-preference";

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

function isViewPreference(value: string): value is ViewPreference {
  return value === "grid" || value === "calendar";
}

/**
 * Persists the user's preferred events view in localStorage.
 * Defaults to "grid" on first visit or when localStorage is unavailable.
 * Mobile calendar is a one-shot fullscreen overlay and is never persisted.
 */
export function useViewPreference(
  defaultView: ViewPreference = "grid",
): [ViewPreference, (v: ViewPreference) => void] {
  const [view, setView] = useState<ViewPreference>(defaultView);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isViewPreference(stored)) {
        // Mobile calendar is a one-shot fullscreen overlay, never a restored view.
        if (stored === "calendar" && isMobileViewport()) return;
        startTransition(() => setView(stored));
      }
    } catch {
      // localStorage unavailable (e.g. private browsing with strict settings)
    }
  }, []);

  function setAndPersist(next: ViewPreference) {
    setView(next);
    try {
      if (isMobileViewport() && next === "calendar") return;
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write errors
    }
  }

  return [view, setAndPersist];
}
