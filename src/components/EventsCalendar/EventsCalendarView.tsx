"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCalendarMonthEvents } from "~/hooks/query/events";
import { Link } from "~/i18n/navigation";
import { formatEventTitle, getEventImageUrl } from "~/lib/event-utils";
import { cn } from "~/lib/utils";
import type { Event } from "~/types";

import {
  computeWeekSlots,
  type EventSlot,
  getMonthWeeks,
  isSameDay,
  isSameMonth,
  type WeekData,
} from "./calendar-utils";

// ─── Layout constants ──────────────────────────────────────────────────────────

/** Vertical space reserved at the top of each cell for the day number */
const DAY_HEADER_PX = 36;
/** Height per event track slot (card + gap) */
const TRACK_HEIGHT_PX = 62;
/** Actual card height within each track slot */
const BAR_HEIGHT_PX = 58;
/** Horizontal inset so cards don't bleed into cell borders */
const BAR_INSET_PX = 3;
/** Minimum cell height when a week has no events */
const BASE_CELL_HEIGHT_PX = 90;

// ─── Locale helpers ────────────────────────────────────────────────────────────

const LOCALE_TO_INTL: Record<string, string> = {
  bg: "bg-BG",
  en: "en-GB",
  ua: "uk-UA",
  ro: "ro-RO",
};

function toIntlLocale(locale: string): string {
  return LOCALE_TO_INTL[locale] ?? "bg-BG";
}

/** Mon–Sun weekday abbreviations for the given locale. */
function getWeekdayLabels(locale: string): string[] {
  const intl = toIntlLocale(locale);
  // 2024-01-01 is a Monday — safe reference to get Mon–Sun in order
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, 1 + i);
    return new Intl.DateTimeFormat(intl, { weekday: "short" }).format(date);
  });
}

function formatMonthYear(year: number, month: number, locale: string): string {
  const intl = toIntlLocale(locale);
  const formatted = new Intl.DateTimeFormat(intl, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Format a Date as YYYY-MM-DD for string comparison with event date fields. */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── WeekRow ───────────────────────────────────────────────────────────────────

type WeekRowProps = {
  weekData: WeekData;
  year: number;
  month: number;
  today: Date;
  todayStr: string;
};

const WeekRow = forwardRef<HTMLDivElement, WeekRowProps>(function WeekRow(
  { weekData, year, month, today, todayStr },
  ref,
) {
  const { days, slots, maxTrack } = weekData;

  const cellHeight = Math.max(
    BASE_CELL_HEIGHT_PX,
    DAY_HEADER_PX + (maxTrack + 1) * TRACK_HEIGHT_PX + 6,
  );

  return (
    <div ref={ref} className="relative border-b last:border-b-0" style={{ height: cellHeight }}>
      {/* Day cells — only responsible for borders, backgrounds and day numbers */}
      <div className="absolute inset-0 grid grid-cols-7">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, year, month);

          return (
            <div
              key={i}
              className={cn(
                "relative border-r last:border-r-0 px-1.5 pt-1.5",
                !inMonth && "bg-muted/30 dark:bg-muted/10",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium leading-none select-none",
                  isToday
                    ? "bg-primary text-primary-foreground font-semibold"
                    : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/50",
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Event bars overlay — absolutely positioned above the day cells */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-1"
        style={{ top: DAY_HEADER_PX }}
      >
        {slots.map((slot) => (
          <EventBar key={`${slot.event.id}-${slot.startCol}`} slot={slot} todayStr={todayStr} />
        ))}
      </div>
    </div>
  );
});

// ─── EventBar ─────────────────────────────────────────────────────────────────

function EventBar({ slot, todayStr }: { slot: EventSlot; todayStr: string }) {
  const { event, track, startCol, endCol, isStart, isEnd } = slot;

  const isPast = event.endDate < todayStr;

  const detailHref =
    event.isEventActive && typeof event.slug === "string" && event.slug.trim()
      ? `/${event.slug.trim()}`
      : null;

  const imageUrl = getEventImageUrl(event.image);

  const style: React.CSSProperties = {
    position: "absolute",
    left: `calc(${(startCol / 7) * 100}% + ${BAR_INSET_PX}px)`,
    width: `calc(${((endCol - startCol + 1) / 7) * 100}% - ${BAR_INSET_PX * 2}px)`,
    top: track * TRACK_HEIGHT_PX,
    height: BAR_HEIGHT_PX,
  };

  const barClass = cn(
    "flex overflow-hidden transition-opacity hover:opacity-85",
    isPast ? "bg-muted/40 text-muted-foreground/50" : "bg-muted text-muted-foreground border border-primary/60",
    isStart && isEnd
      ? "rounded-lg"
      : isStart
        ? "rounded-l-lg rounded-r-[3px]"
        : isEnd
          ? "rounded-r-lg rounded-l-[3px]"
          : "rounded-[3px]",
  );

  const content = isStart ? (
    <>
      {/* Image strip on the left */}
      <div className="relative shrink-0" style={{ width: BAR_HEIGHT_PX - 2, height: BAR_HEIGHT_PX }}>
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="120px"
          className={cn("object-cover", isPast && "grayscale opacity-50")}
        />
      </div>
      {/* Text on the right */}
      <div className="flex min-w-0 flex-col justify-center gap-0.5 px-2 py-1">
        <span className="line-clamp-2 text-[11px] font-semibold leading-tight">
          {formatEventTitle(event.title)}
        </span>
      </div>
    </>
  ) : (
    /* Continuation bar — no image, title repeated so multi-week events stay readable */
    <div className="flex min-w-0 items-center px-2 py-1">
      <span className="truncate text-[11px] font-semibold leading-tight">
        {formatEventTitle(event.title)}
      </span>
    </div>
  );

  if (detailHref) {
    return (
      <Link
        href={detailHref}
        className={cn(barClass, "pointer-events-auto")}
        style={style}
        title={event.title}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={barClass} style={style} title={event.title}>
      {content}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Props = {
  events: Event[];
};

export function EventsCalendarView({ events }: Props) {
  const locale = useLocale();
  const t = useTranslations("HomePage");

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(now), [now]);
  const [year, setYear] = useState(() => now.getFullYear());
  const [month, setMonth] = useState(() => now.getMonth());

  const todayRowRef = useRef<HTMLDivElement>(null);

  // On mount, scroll the current week row into view. On mobile the calendar grid
  // is an internally-scrollable container (max-h-[72svh]), so this scrolls within
  // it. On desktop all weeks are visible, so scrollIntoView is a no-op.
  // rAF defers the scroll until after the first paint so cell heights are settled,
  // which prevents the animation from starting from an incorrect position.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      todayRowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Fetches all events (including past) for the displayed month.
  // The hook is only enabled for the current month and past months — future months stay empty.
  const { data: monthEvents = [] } = useCalendarMonthEvents(year, month);

  // For current/past months, monthEvents is the authoritative source (includes past events).
  // While monthEvents loads, supplement with the already-cached active events to avoid flicker.
  // For future months, monthEvents is empty so we fall back to the active events prop.
  const displayEvents = useMemo(() => {
    const isCurrentOrPast =
      year < now.getFullYear() ||
      (year === now.getFullYear() && month <= now.getMonth());

    if (!isCurrentOrPast) return events;

    const monthIds = new Set(monthEvents.map((e) => e.id));
    const activeNotInMonth = events.filter((e) => !monthIds.has(e.id));
    return [...monthEvents, ...activeNotInMonth];
  }, [events, monthEvents, year, month, now]);

  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month]);
  const weekDatas = useMemo(
    () => weeks.map((w) => computeWeekSlots(w, displayEvents)),
    [weeks, displayEvents],
  );
  const todayWeekIndex = useMemo(
    () => weeks.findIndex((week) => week.some((day) => isSameDay(day, now))),
    [weeks, now],
  );
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="mt-4 w-full">
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={prevMonth}
          aria-label={t("prevMonth")}
          className="size-8 shrink-0"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>

        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            {formatMonthYear(year, month, locale)}
          </h2>
          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-7 px-2.5 text-xs"
            >
              {t("today")}
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={nextMonth}
          aria-label={t("nextMonth")}
          className="size-8 shrink-0"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      {/* Calendar grid
          Mobile: internally scrollable (both axes) at max 72svh
          Desktop: full width, no height cap, normal page scroll        */}
      <div className="overflow-auto rounded-xl border md:overflow-visible max-h-[72svh] md:max-h-none">
        <div className="min-w-[560px] md:min-w-0">
          {/* Weekday header row */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {weekdayLabels.map((label, i) => (
              <div
                key={i}
                className={cn(
                  "py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                  i < 6 && "border-r",
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week rows */}
          {weekDatas.map((weekData, i) => (
            <WeekRow
              key={i}
              ref={i === todayWeekIndex ? todayRowRef : undefined}
              weekData={weekData}
              year={year}
              month={month}
              today={now}
              todayStr={todayStr}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
