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
  "filter.open",
  "filter.tag",
  "advertise.cta.discuss_partnership",
  "advertise.cta.see_opportunities",
  "advertise.cta.add_event",
  "embed.event",
  "embed.see_more",
  "event.promo.article",
  "event.save",
  "event.unsave",
  "event.save.guest",
  "event.buy_tickets",
  "event.add_to_calendar",
  "event.share_facebook",
  "event.facebook",
  "event.organizer",
  "home.view.calendar",
  "home.create_event",
  "header.create_event",
  "auth.signup.from_save",
  "auth.login.from_save",
  "reminders.enable",
  "nav.events",
  "nav.saved",
  "nav.more",
  "nav.profile",
  "nav.more.current",
  "nav.more.past",
  "nav.more.articles",
  "nav.more.why",
  "nav.more.advertise",
  "nav.more.facebook",
  "nav.more.instagram",
  "nav.more.tiktok",
  "nav.profile.public",
  "nav.profile.create_event",
  "nav.profile.my_events",
  "nav.profile.account",
  "nav.profile.saved",
  "nav.auth.login",
  "nav.auth.signup",
] as const;

export type TrackedEventKey = (typeof TRACKED_EVENT_KEYS)[number];
