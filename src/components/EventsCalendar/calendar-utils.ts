import { parseLocalDate } from "~/lib/event-utils";
import type { Event } from "~/types";

export type EventSlot = {
  event: Event;
  track: number;
  /** 0 = Monday of this week, 6 = Sunday */
  startCol: number;
  endCol: number;
  /** True when the event actually starts within this week (not carried over from prior week) */
  isStart: boolean;
  /** True when the event actually ends within this week (not continuing to next week) */
  isEnd: boolean;
};

export type WeekData = {
  days: Date[];
  slots: EventSlot[];
  /** Highest track index used in this week, -1 when no events */
  maxTrack: number;
};

const MS_PER_DAY = 86_400_000;
const MAX_TRACKS = 10;

function wholeDaysBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY);
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
    const evEndMs = parseLocalDate(event.endDate).getTime();
    // Standard interval overlap: event overlaps week iff evEnd >= weekStart AND evStart <= weekEnd
    return evEndMs >= wStartMs && evStartMs <= wEndMs;
  });

  // Earlier start first; for ties, longer duration first so multi-day events claim higher tracks
  relevant.sort((a, b) => {
    const aMs = parseLocalDate(a.startDate).getTime();
    const bMs = parseLocalDate(b.startDate).getTime();
    if (aMs !== bMs) return aMs - bMs;
    const aDur = parseLocalDate(a.endDate).getTime() - aMs;
    const bDur = parseLocalDate(b.endDate).getTime() - bMs;
    return bDur - aDur;
  });

  // trackCols[t] = set of column indices (0–6) already claimed in track t
  const trackCols: Set<number>[] = Array.from({ length: MAX_TRACKS }, () => new Set());
  const slots: EventSlot[] = [];

  for (const event of relevant) {
    const evStart = parseLocalDate(event.startDate);
    const evEnd = parseLocalDate(event.endDate);

    const startCol = Math.max(0, Math.min(6, wholeDaysBetween(evStart, weekStart)));
    const endCol = Math.max(0, Math.min(6, wholeDaysBetween(evEnd, weekStart)));

    if (startCol > endCol) continue; // guard against bad data

    let track = -1;
    outer: for (let t = 0; t < MAX_TRACKS; t++) {
      for (let c = startCol; c <= endCol; c++) {
        if (trackCols[t]!.has(c)) continue outer;
      }
      track = t;
      break;
    }
    if (track === -1) continue; // all tracks full – skip

    for (let c = startCol; c <= endCol; c++) {
      trackCols[track]!.add(c);
    }

    slots.push({
      event,
      track,
      startCol,
      endCol,
      isStart: evStart.getTime() >= wStartMs,
      isEnd: evEnd.getTime() <= wEndMs,
    });
  }

  const maxTrack = slots.length > 0 ? Math.max(...slots.map((s) => s.track)) : -1;
  return { days: week, slots, maxTrack };
}
