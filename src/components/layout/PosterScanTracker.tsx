"use client";

import { useEffect } from "react";

import { posterCampaignFromSearch } from "~/lib/analytics/poster-campaign";

const STORAGE_PREFIX = "a4r-poster-scan:";

/**
 * Counts a printed poster scan from the URL, including visitors who reject
 * cookies. The request is fire-and-forget and does not block rendering.
 * One count per browser tab, so a refresh does not add another scan.
 */
export function PosterScanTracker() {
  useEffect(() => {
    const campaign = posterCampaignFromSearch(window.location.search);
    if (!campaign) return;

    const storageKey = `${STORAGE_PREFIX}${campaign}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Private mode can block storage. Still count this visit.
    }

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posterCampaign: campaign }),
      keepalive: true,
    }).catch(() => {
      // Tracking must never surface to the user.
    });
  }, []);

  return null;
}
