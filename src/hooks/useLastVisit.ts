"use client";

import { startTransition, useEffect, useState } from "react";

const LAST_VISIT_KEY = "home-last-visit";
const SESSION_BASELINE_KEY = "home-visit-baseline";

/**
 * Returns the time of the previous visit, frozen for the whole browser session
 * so refreshes and back-navigation keep the same "new since" baseline.
 *
 * `null` during SSR, before mount, on a first visit, or when storage is
 * unavailable — callers should treat it as "nothing is new".
 */
export function useLastVisit(): number | null {
  const [baseline, setBaseline] = useState<number | null>(null);

  useEffect(() => {
    try {
      let sessionBaseline = sessionStorage.getItem(SESSION_BASELINE_KEY);
      if (sessionBaseline === null) {
        // An empty string marks a first visit, so it is not retried this session.
        sessionBaseline = localStorage.getItem(LAST_VISIT_KEY) ?? "";
        sessionStorage.setItem(SESSION_BASELINE_KEY, sessionBaseline);
      }
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());

      const parsed = Date.parse(sessionBaseline);
      if (Number.isFinite(parsed)) {
        startTransition(() => setBaseline(parsed));
      }
    } catch {
      // Storage blocked (private mode, strict settings) — no badge.
    }
  }, []);

  return baseline;
}
