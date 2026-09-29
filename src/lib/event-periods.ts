import { EVENT_PERIOD_MONTHS_AHEAD } from "~/constants";
import { todayInSofia } from "~/lib/event-utils";

/**
 * Date-scoped landing pages. "Събития в Русе този уикенд" and "събития в Русе
 * октомври" are searched directly, but the homepage date filter answers them
 * with a `noindex` query string, so those queries had no page to rank. These
 * slugs give each one a stable, crawlable URL.
 */
export type EventPeriodKind = "today" | "weekend" | "month";

export type EventPeriod = {
  kind: EventPeriodKind;
  slug: string;
  /** Inclusive range, `YYYY-MM-DD`, matching the `from`/`to` event filters. */
  from: string;
  to: string;
};

export const EVENTS_PERIOD_BASE_PATH = "/events";

export const TODAY_SLUG = "today";
export const WEEKEND_SLUG = "this-weekend";

const MONTH_SLUG_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function eventPeriodPath(slug: string): string {
  return `${EVENTS_PERIOD_BASE_PATH}/${slug}`;
}

/** Calendar maths on `YYYY-MM-DD` only, anchored at UTC noon to dodge DST. */
function atUtcNoon(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: string, days: number): string {
  const shifted = atUtcNoon(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return toDateString(shifted);
}

function lastDayOfMonth(year: number, month: number): string {
  // Day 0 of the next month is the last day of this one.
  return toDateString(new Date(Date.UTC(year, month, 0, 12)));
}

/**
 * The upcoming Saturday and Sunday. On a Saturday that is today and tomorrow; on
 * a Sunday the weekend is ending, so it is today alone.
 */
function weekendRange(today: string): { from: string; to: string } {
  const dayOfWeek = atUtcNoon(today).getUTCDay();
  if (dayOfWeek === 0) return { from: today, to: today };
  if (dayOfWeek === 6) return { from: today, to: shiftDays(today, 1) };

  const saturday = shiftDays(today, 6 - dayOfWeek);
  return { from: saturday, to: shiftDays(saturday, 1) };
}

/**
 * Returns `null` for anything that is not a known period, including months in
 * the past — those would be stale the moment they are generated, and the event
 * archive is already reachable through `/past`.
 */
export function resolveEventPeriod(
  slug: string,
  today: string = todayInSofia(),
): EventPeriod | null {
  if (slug === TODAY_SLUG) {
    return { kind: "today", slug, from: today, to: today };
  }

  if (slug === WEEKEND_SLUG) {
    return { kind: "weekend", slug, ...weekendRange(today) };
  }

  const month = MONTH_SLUG_PATTERN.exec(slug);
  if (!month) return null;

  const year = Number(month[1]);
  const monthNumber = Number(month[2]);
  const from = `${month[1]}-${month[2]}-01`;
  const to = lastDayOfMonth(year, monthNumber);
  if (to < today) return null;

  // Never show a past week of the current month as if it were upcoming.
  return { kind: "month", slug, from: from < today ? today : from, to };
}

export function monthSlug(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/**
 * Every period slug the site publishes — used by `generateStaticParams` and the
 * sitemap so the two can never drift apart.
 */
export function eventPeriodSlugs(today: string = todayInSofia()): string[] {
  const start = atUtcNoon(today);
  const months: string[] = [];

  for (let offset = 0; offset <= EVENT_PERIOD_MONTHS_AHEAD; offset++) {
    const month = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1, 12),
    );
    months.push(monthSlug(month.getUTCFullYear(), month.getUTCMonth()));
  }

  return [TODAY_SLUG, WEEKEND_SLUG, ...months];
}

/** First day of the period's month, for locale-aware month/year formatting. */
export function eventPeriodMonthAnchor(period: EventPeriod): string {
  return `${period.slug}-01`;
}
