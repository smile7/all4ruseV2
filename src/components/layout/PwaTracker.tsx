"use client";

import { useEffect } from "react";

import {
  detectStandaloneApp,
  pwaTrackingEnabled,
  stripPwaOpenParam,
  trackPwaCount,
} from "~/lib/analytics/track-pwa";

/** Counts a fresh install, and one icon open per browser per day. */
export function PwaTracker() {
  useEffect(() => {
    if (!pwaTrackingEnabled()) return;

    stripPwaOpenParam();
    if (detectStandaloneApp()) {
      trackPwaCount("icon_open");
    }

    const onInstalled = () => {
      trackPwaCount("fresh_install");
    };

    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}
