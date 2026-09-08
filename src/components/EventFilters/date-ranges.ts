import { addDays, format } from "date-fns";

import { parseLocalDate, todayInSofia } from "~/lib/event-utils";

export type DateRange = { from: string; to: string };

/**
 * Quick-range anchors are computed from the Europe/Sofia calendar day, not the
 * runtime timezone, so the server render and the browser agree on which chip is
 * active (Vercel runs in UTC).
 */
function today(): Date {
  return parseLocalDate(todayInSofia());
}

function iso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayIso(): string {
  return todayInSofia();
}

/** Friday–Sunday of the current weekend (Sat/Sun fall back to the running one). */
export function weekendRange(): DateRange {
  const now = today();
  const day = now.getDay(); // 0=Sun, 1=Mon, …, 5=Fri, 6=Sat

  let friday: Date;
  if (day === 5) friday = now;
  else if (day === 6) friday = addDays(now, -1);
  else if (day === 0) friday = addDays(now, -2);
  else friday = addDays(now, 5 - day); // Mon–Thu → next Fri

  return { from: iso(friday), to: iso(addDays(friday, 2)) };
}

/** Today through the upcoming Sunday. */
export function thisWeekRange(): DateRange {
  const now = today();
  const day = now.getDay();
  const daysToSunday = day === 0 ? 0 : 7 - day;

  return { from: iso(now), to: iso(addDays(now, daysToSunday)) };
}
