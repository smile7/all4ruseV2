/**
 * Allowlisted click events stored in `click_counts`.
 *
 * To track a new control:
 * 1. Add a stable key here
 * 2. Call `trackClick(key)` from the handler, or wrap a link with `TrackedLink`
 *
 * No migration is required — a new key gets its own row on the first click.
 */
export const TRACKED_EVENT_KEYS = [
  "filter.today",
  "filter.this_weekend",
  "filter.this_week",
  "filter.free",
  "advertise.cta.discuss_partnership",
  "advertise.cta.see_opportunities",
  "advertise.cta.add_event",
  "event.promo.theatre_article",
] as const;

export type TrackedEventKey = (typeof TRACKED_EVENT_KEYS)[number];
