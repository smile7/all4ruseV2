/**
 * Daily counters in `pwa_events`, same idea as `click_counts`.
 *
 * `fresh_install` — the browser finished installing the app.
 * `icon_open` — the installed app was opened. Sent once per browser per day.
 */
export const PWA_COUNT_KEYS = ["fresh_install", "icon_open"] as const;

export type PwaCountKey = (typeof PWA_COUNT_KEYS)[number];
