import {
  PWA_OPEN_QUERY_PARAM,
  type PwaDisplayMode,
  type PwaEventName,
  type PwaLaunchSource,
  type PwaPlatform,
} from "~/lib/analytics/pwa-events";

const VISITOR_KEY = "a4r-visitor-id";
const SENT_PREFIX = "a4r-pwa-sent:";
const SESSION_START_KEY = "a4r-pwa-session-start";

const ONCE_EVENTS = new Set<PwaEventName>([
  "prompt_eligible",
  "prompt_accepted",
  "prompt_dismissed",
  "installed",
  "push_granted",
  "push_denied",
]);

const DAILY_EVENTS = new Set<PwaEventName>([
  "related_installed",
  "standalone_open",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TrackPwaEventInput = {
  eventName: PwaEventName;
  durationSeconds?: number;
  launchSource?: PwaLaunchSource | null;
};

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

function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Private mode can block storage. The server still dedupes.
  }
}

function visitorId(): string | null {
  const existing = readStorage(localStorage, VISITOR_KEY);
  if (existing && UUID_RE.test(existing)) return existing;
  if (typeof crypto.randomUUID !== "function") return null;
  const id = crypto.randomUUID();
  writeStorage(localStorage, VISITOR_KEY, id);
  return UUID_RE.test(id) ? id : null;
}

function dedupeStorageKey(eventName: PwaEventName): string | null {
  if (ONCE_EVENTS.has(eventName)) return `${SENT_PREFIX}${eventName}`;
  if (DAILY_EVENTS.has(eventName)) {
    return `${SENT_PREFIX}${eventName}:${sofiaDate()}`;
  }
  return null;
}

export function detectPwaPlatform(): PwaPlatform {
  const nav = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  if (nav.userAgentData?.mobile === true) return "mobile";
  if (nav.userAgentData?.mobile === false) return "desktop";

  const ua = navigator.userAgent;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "mobile";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return "mobile";
  if (/Macintosh|Windows NT|Linux|CrOS|X11/i.test(ua)) return "desktop";
  return "unknown";
}

export function detectPwaDisplayMode(): PwaDisplayMode {
  const modes = ["standalone", "fullscreen", "minimal-ui"] as const;
  for (const mode of modes) {
    if (window.matchMedia(`(display-mode: ${mode})`).matches) return mode;
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return "standalone";
  return "browser";
}

/** Reads `a4r_open` and removes it so shared URLs stay clean. */
export function consumePwaLaunchSource(): PwaLaunchSource | null {
  const url = new URL(window.location.href);
  const value = url.searchParams.get(PWA_OPEN_QUERY_PARAM);
  const launch = value === "icon" || value === "notification" ? value : null;
  if (value === null) return null;

  url.searchParams.delete(PWA_OPEN_QUERY_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
  return launch;
}

export function markStandaloneSession(): void {
  if (readStorage(sessionStorage, SESSION_START_KEY)) return;
  writeStorage(sessionStorage, SESSION_START_KEY, String(Date.now()));
}

export function standaloneSessionDurationSeconds(): number | null {
  const raw = readStorage(sessionStorage, SESSION_START_KEY);
  if (!raw) return null;
  const start = Number(raw);
  if (!Number.isFinite(start)) return null;
  const seconds = Math.round((Date.now() - start) / 1000);
  if (seconds < 1) return null;
  return Math.min(seconds, 86_400);
}

export function trackPwaEvent(input: TrackPwaEventInput): void {
  if (!pwaTrackingEnabled()) return;

  const id = visitorId();
  if (!id) return;

  const isDurationUpdate =
    input.eventName === "standalone_open" && input.durationSeconds != null;
  const dedupeKey = isDurationUpdate ? null : dedupeStorageKey(input.eventName);
  if (dedupeKey && readStorage(localStorage, dedupeKey)) return;
  if (dedupeKey) writeStorage(localStorage, dedupeKey, "1");

  const body = JSON.stringify({
    visitorId: id,
    eventName: input.eventName,
    platform: detectPwaPlatform(),
    displayMode: detectPwaDisplayMode(),
    launchSource: input.launchSource ?? null,
    durationSeconds: input.durationSeconds ?? null,
  });

  void fetch("/api/pwa-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Tracking must never surface to the user.
  });
}
