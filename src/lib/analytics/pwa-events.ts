/**
 * PWA signals stored in `pwa_events`.
 *
 * One-time rows (deduped forever per visitor): prompt_eligible,
 * prompt_accepted, prompt_dismissed, installed, push_granted, push_denied.
 *
 * Daily rows (Europe/Sofia): related_installed, standalone_open,
 * notification_open. Notification clicks increment `hit_count`.
 * Standalone sessions keep the longest `duration_seconds` that day.
 */
export const PWA_EVENT_NAMES = [
  "prompt_eligible",
  "prompt_accepted",
  "prompt_dismissed",
  "installed",
  "related_installed",
  "standalone_open",
  "push_granted",
  "push_denied",
  "notification_open",
] as const;

export type PwaEventName = (typeof PWA_EVENT_NAMES)[number];

export const PWA_PLATFORMS = ["desktop", "mobile", "unknown"] as const;

export type PwaPlatform = (typeof PWA_PLATFORMS)[number];

export const PWA_DISPLAY_MODES = [
  "browser",
  "standalone",
  "minimal-ui",
  "fullscreen",
  "unknown",
] as const;

export type PwaDisplayMode = (typeof PWA_DISPLAY_MODES)[number];

export const PWA_LAUNCH_SOURCES = ["icon", "notification"] as const;

export type PwaLaunchSource = (typeof PWA_LAUNCH_SOURCES)[number];

/** Query param on manifest start_url and notification opens. Stripped after read. */
export const PWA_OPEN_QUERY_PARAM = "a4r_open";

/** Service worker → page message when a notification focuses an open window. */
export const PWA_NOTIFICATION_OPEN_MESSAGE = "a4r-notification-open";
