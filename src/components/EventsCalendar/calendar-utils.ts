import { parseLocalDate } from "~/lib/event-utils";
import type { Event } from "~/types";

export type EventSlot = {
  event: Event;
  track: number;
  /** 0-based column index within the rendered range (week or month) */
  startCol: number;
  endCol: number;
  /** True when the event actually starts within this range */
  isStart: boolean;
  /** True when the event actually ends within this range */
  isEnd: boolean;
};

export type WeekData = {
  days: Date[];
  slots: EventSlot[];
  /** Highest track index used in this week, -1 when no events */
  maxTrack: number;
};

const MS_PER_DAY = 86_400_000;

/** Events spanning more than this many calendar days are capped in the week-grid view. */
const MAX_CALENDAR_DAYS = 3;

function wholeDaysBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}

/**
 * Returns the effective end date for calendar rendering.
 * Events longer than MAX_CALENDAR_DAYS are capped so only the first 3 days
 * appear in the calendar; the rest are shown only in the current-events list.
 */
function getEffectiveCalendarEndDate(event: Event): Date {
  const evStart = parseLocalDate(event.startDate);
  const evEnd = parseLocalDate(event.endDate);
  const durationDays = wholeDaysBetween(evEnd, evStart) + 1;
  if (durationDays <= MAX_CALENDAR_DAYS) return evEnd;
  const cappedEnd = new Date(evStart);
  cappedEnd.setDate(cappedEnd.getDate() + MAX_CALENDAR_DAYS - 1);
  return cappedEnd;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

/**
 * Returns the weeks (Mon–Sun) that cover the given year/month.
 * May include trailing days from adjacent months to complete the last week.
 */
export function getMonthWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Offset back to the Monday on or before the first day (European week start)
  const dow = firstDay.getDay(); // 0=Sun, 1=Mon …
  const offsetToMonday = (dow + 6) % 7;
  const cursor = new Date(firstDay);
  cursor.setDate(cursor.getDate() - offsetToMonday);

  const weeks: Date[][] = [];

  while (true) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor > lastDay && weeks.length >= 4) break;
  }

  return weeks;
}

/**
 * Assigns each event that overlaps with `week` to a non-overlapping horizontal
 * track so multi-day events can be rendered as spanning bars.
 */
export function computeWeekSlots(week: Date[], events: Event[]): WeekData {
  const weekStart = week[0]!;
  const weekEnd = week[6]!;
  const wStartMs = weekStart.getTime();
  const wEndMs = weekEnd.getTime();

  const relevant = events.filter((event) => {
    const evStartMs = parseLocalDate(event.startDate).getTime();
    // Use the capped end so events beyond 3 days don't bleed past their allowed range.
    const evEffectiveEndMs = getEffectiveCalendarEndDate(event).getTime();
    return evEffectiveEndMs >= wStartMs && evStartMs <= wEndMs;
  });

  // Single-day events first (lower track → rendered above multi-day bars).
  // Within each group: earlier start first; for same start, longer bar first.
  relevant.sort((a, b) => {
    const aStart = parseLocalDate(a.startDate);
    const bStart = parseLocalDate(b.startDate);
    const aEffEnd = getEffectiveCalendarEndDate(a);
    const bEffEnd = getEffectiveCalendarEndDate(b);
    const aIsMulti = wholeDaysBetween(aEffEnd, aStart) > 0;
    const bIsMulti = wholeDaysBetween(bEffEnd, bStart) > 0;
    if (aIsMulti !== bIsMulti) return aIsMulti ? 1 : -1;
    const aMs = aStart.getTime();
    const bMs = bStart.getTime();
    if (aMs !== bMs) return aMs - bMs;
    return (bEffEnd.getTime() - bMs) - (aEffEnd.getTime() - aMs);
  });

  // trackCols[t] = set of column indices (0–6) already claimed in track t.
  // Grows dynamically so every event gets a track regardless of how many there are.
  const trackCols: Set<number>[] = [];
  const slots: EventSlot[] = [];

  for (const event of relevant) {
    const evStart = parseLocalDate(event.startDate);
    const evEffectiveEnd = getEffectiveCalendarEndDate(event);

    const startCol = Math.max(
      0,
      Math.min(6, wholeDaysBetween(evStart, weekStart)),
    );
    const endCol = Math.max(
      0,
      Math.min(6, wholeDaysBetween(evEffectiveEnd, weekStart)),
    );

    if (startCol > endCol) continue; // guard against bad data

    let track = -1;
    outer: for (let t = 0; ; t++) {
      if (t >= trackCols.length) trackCols.push(new Set());
      for (let c = startCol; c <= endCol; c++) {
        if (trackCols[t]!.has(c)) continue outer;
      }
      track = t;
      break;
    }

    for (let c = startCol; c <= endCol; c++) {
      trackCols[track]!.add(c);
    }

    slots.push({
      event,
      track,
      startCol,
      endCol,
      isStart: evStart.getTime() >= wStartMs,
      isEnd: evEffectiveEnd.getTime() <= wEndMs,
    });
  }

  const maxTrack =
    slots.length > 0 ? Math.max(...slots.map((s) => s.track)) : -1;
  return { days: week, slots, maxTrack };
}

// ─── Month-column helpers (horizontal timeline view) ──────────────────────────

/**
 * Returns all calendar days in the given month (1st → last day, no padding from
 * adjacent months).
 */
export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Assigns each event that overlaps with the given day range to a non-overlapping
 * track, suitable for the horizontal timeline view.
 *
 * Applies the same 3-day cap as `computeWeekSlots` so the title date-range suffix
 * is shown consistently in both calendar views.
 * Single-day events are sorted first (lower track → rendered above multi-day bars).
 */
export function computeColumnarSlots(
  days: Date[],
  events: Event[],
): { slots: EventSlot[]; maxTrack: number } {
  const N = days.length;
  if (N === 0) return { slots: [], maxTrack: -1 };

  const rangeStart = days[0]!;
  const rangeEnd = days[N - 1]!;
  const rStartMs = rangeStart.getTime();
  const rEndMs = rangeEnd.getTime();

  const relevant = events.filter((event) => {
    const evStartMs = parseLocalDate(event.startDate).getTime();
    const evEffectiveEndMs = getEffectiveCalendarEndDate(event).getTime();
    return evEffectiveEndMs >= rStartMs && evStartMs <= rEndMs;
  });

  // Single-day events first (lower track → rendered above multi-day bars).
  // Within each group: earlier start first; for same start, longer bar first.
  relevant.sort((a, b) => {
    const aStart = parseLocalDate(a.startDate);
    const bStart = parseLocalDate(b.startDate);
    const aEffEnd = getEffectiveCalendarEndDate(a);
    const bEffEnd = getEffectiveCalendarEndDate(b);
    const aIsMulti = wholeDaysBetween(aEffEnd, aStart) > 0;
    const bIsMulti = wholeDaysBetween(bEffEnd, bStart) > 0;
    if (aIsMulti !== bIsMulti) return aIsMulti ? 1 : -1;
    const aMs = aStart.getTime();
    const bMs = bStart.getTime();
    if (aMs !== bMs) return aMs - bMs;
    return (bEffEnd.getTime() - bMs) - (aEffEnd.getTime() - aMs);
  });

  const trackCols: Set<number>[] = [];
  const slots: EventSlot[] = [];

  for (const event of relevant) {
    const evStart = parseLocalDate(event.startDate);
    const evEffectiveEnd = getEffectiveCalendarEndDate(event);

    const startCol = Math.max(
      0,
      Math.min(N - 1, wholeDaysBetween(evStart, rangeStart)),
    );
    const endCol = Math.max(
      0,
      Math.min(N - 1, wholeDaysBetween(evEffectiveEnd, rangeStart)),
    );

    if (startCol > endCol) continue;

    let track = -1;
    outer: for (let t = 0; ; t++) {
      if (t >= trackCols.length) trackCols.push(new Set());
      for (let c = startCol; c <= endCol; c++) {
        if (trackCols[t]!.has(c)) continue outer;
      }
      track = t;
      break;
    }

    for (let c = startCol; c <= endCol; c++) {
      trackCols[track]!.add(c);
    }

    slots.push({
      event,
      track,
      startCol,
      endCol,
      isStart: evStart.getTime() >= rStartMs,
      isEnd: evEffectiveEnd.getTime() <= rEndMs,
    });
  }

  const maxTrack =
    slots.length > 0 ? Math.max(...slots.map((s) => s.track)) : -1;
  return { slots, maxTrack };
}
