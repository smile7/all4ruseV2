import type { PwaCountKey } from "~/lib/analytics/pwa-events";

const SENT_PREFIX = "a4r-pwa-sent:";

function productionHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com")
      .hostname;
  } catch {
    return "all4ruse.com";
  }
}

/** Production site only, so local and preview browsing does not fill the table. */
export function pwaTrackingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV !== "production") return false;
  const host = window.location.hostname;
  const configured = productionHost();
  return (
    host === configured ||
    host === "all4ruse.com" ||
    host === "www.all4ruse.com"
  );
}

function sofiaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dedupeStorageKey(eventKey: PwaCountKey): string {
  // Keep the keys the first version wrote, so a browser that already
  // counted today does not add itself again after this change.
  if (eventKey === "icon_open") {
    return `${SENT_PREFIX}standalone_open:${sofiaDate()}`;
  }
  return `${SENT_PREFIX}installed`;
}

export function detectStandaloneApp(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/** Removes a leftover install-tracking query param from older app launches. */
export function stripPwaOpenParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("a4r_open")) return;
  url.searchParams.delete("a4r_open");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

export function trackPwaCount(eventKey: PwaCountKey): void {
  if (!pwaTrackingEnabled()) return;

  const storageKey = dedupeStorageKey(eventKey);
  try {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, "1");
  } catch {
    // Private mode can block storage. Still count this occurrence.
  }

  void fetch("/api/pwa-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventKey }),
    keepalive: true,
  }).catch(() => {
    // Tracking must never surface to the user.
  });
}
