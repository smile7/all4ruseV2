"use client";

import { useSyncExternalStore } from "react";

import { formatFullDate } from "~/lib/event-utils";

type Props = {
  dateStr: string;
  locale: string;
  /** Calendar date from the server render. Stable for the whole ISR window. */
  calendarDate: string;
  today: string;
  tomorrow: string;
  className?: string;
  /** Shown before the date, e.g. the arrow on a multi-day end date. */
  prefix?: string;
};

const subscribeToNothing = () => () => {};

/**
 * The event page is cached for a day, so yesterday's HTML can still say
 * "tomorrow" after midnight in Sofia. The cached text is the calendar date,
 * which does not go stale. "Today" / "tomorrow" is applied once hydrated.
 */
export function EventDetailDate({
  dateStr,
  locale,
  calendarDate,
  today,
  tomorrow,
  className,
  prefix,
}: Props) {
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  const text = (() => {
    if (!hydrated) return calendarDate;
    const labels = { today, tomorrow };
    const plain = formatFullDate(dateStr, locale);
    const withRelative = formatFullDate(dateStr, locale, labels);
    // Other dates keep the server string so Node and browser Intl cannot
    // disagree after hydration. Today and tomorrow differ from that string.
    return withRelative === plain ? calendarDate : withRelative;
  })();

  return (
    <time dateTime={dateStr} className={className}>
      {prefix}
      {text}
    </time>
  );
}
