"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCalendarMonthEvents } from "~/hooks/query/events";
import { Link } from "~/i18n/navigation";
import {
  formatEventTitleWithDateRange,
  getEventImageUrl,
} from "~/lib/event-utils";
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
/** Height per event track slot (card + gap) — desktop */
const TRACK_HEIGHT_PX = 62;
/** Height per event track slot — mobile (taller to fit 3-line titles) */
const MOBILE_TRACK_HEIGHT_PX = 163;
/** Horizontal inset so cards don't bleed into cell borders */
const BAR_INSET_PX = 3;
/** Minimum cell height when a week has no events */
const BASE_CELL_HEIGHT_PX = 90;
/** Approximate height of the 2-row sticky header (weekday labels + date row) */
const STICKY_HEADER_PX = 68;

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

/**
 * Scrolls the calendar container so that `row` sits flush against the bottom
 * edge of the sticky header — i.e. the active week becomes the first visible row.
 */
function scrollTodayIntoView(
  container: HTMLDivElement | null,
  row: HTMLDivElement | null | undefined,
) {
  if (!container || !row) return;
  const rowTop = row.getBoundingClientRect().top;
  const containerTop = container.getBoundingClientRect().top;
  const target =
    container.scrollTop + (rowTop - containerTop) - STICKY_HEADER_PX;
  container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
}

// ─── WeekRow ───────────────────────────────────────────────────────────────────

type WeekRowProps = {
  weekData: WeekData;
  year: number;
  month: number;
  today: Date;
  todayStr: string;
  /** Whether to render date numbers in cells.
   *  False for the topmost visible week — the sticky header already shows those. */
  showDates: boolean;
};

const WeekRow = forwardRef<HTMLDivElement, WeekRowProps>(function WeekRow(
  { weekData, year, month, today, todayStr, showDates },
  ref,
) {
  const { days, slots, maxTrack } = weekData;

  const cellHeight = Math.max(
    BASE_CELL_HEIGHT_PX,
    DAY_HEADER_PX + (maxTrack + 1) * TRACK_HEIGHT_PX + 6,
  );
  const mobileCellHeight = Math.max(
    BASE_CELL_HEIGHT_PX,
    DAY_HEADER_PX + (maxTrack + 1) * MOBILE_TRACK_HEIGHT_PX + 6,
  );

  return (
    <div
      ref={ref}
      className="relative h-(--ch-m) border-b last:border-b-0 md:h-(--ch-d)"
      style={
        {
          "--ch-m": `${mobileCellHeight}px`,
          "--ch-d": `${cellHeight}px`,
        } as React.CSSProperties
      }
    >
      {/* Day cells — borders, backgrounds, and (when not the topmost visible week) date numbers */}
      <div className="absolute inset-0 grid grid-cols-7">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, year, month);

          return (
            <div
              key={i}
              className={cn(
                "relative border-r px-1.5 pt-1.5 last:border-r-0",
                !inMonth && "bg-muted/30 dark:bg-muted/10",
              )}
            >
              {showDates && (
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm leading-none font-medium select-none",
                    isToday
                      ? "bg-primary text-primary-foreground font-semibold"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                  )}
                >
                  {day.getDate()}
                </span>
              )}
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
          <EventBar
            key={`${slot.event.id}-${slot.startCol}`}
            slot={slot}
            todayStr={todayStr}
          />
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

  const style = {
    position: "absolute",
    left: `calc(${(startCol / 7) * 100}% + ${BAR_INSET_PX}px)`,
    width: `calc(${((endCol - startCol + 1) / 7) * 100}% - ${BAR_INSET_PX * 2}px)`,
    "--top-m": `${track * MOBILE_TRACK_HEIGHT_PX}px`,
    "--top-d": `${track * TRACK_HEIGHT_PX}px`,
  } as React.CSSProperties;

  const barClass = cn(
    "overflow-hidden transition-opacity hover:opacity-85",
    // Responsive top position via CSS vars (mobile uses taller tracks).
    "top-(--top-m) md:top-(--top-d)",
    // Responsive height: 118px on mobile, 58px on desktop.
    "h-[156px] md:h-[58px]",
    // All start cards: stacked (column) on mobile, side-by-side (row) on md+.
    "flex flex-col md:flex-row",
    isPast
      ? "bg-muted text-muted-foreground/50"
      : "bg-muted text-muted-foreground border border-primary/60",
    isStart && isEnd
      ? "rounded-lg"
      : isStart
        ? "rounded-l-lg rounded-r-[3px]"
        : isEnd
          ? "rounded-r-lg rounded-l-[3px]"
          : "rounded-[3px]",
  );

  const content = isStart ? (
    // Stacked on mobile: full-width image strip on top, title below.
    // On md+ reverts to side-by-side via flex-row on the bar.
    <>
      <div className="relative h-[70px] w-full shrink-0 md:h-full md:w-14">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 768px) 56px, 200px"
          className={cn("object-cover", isPast && "opacity-50 grayscale")}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-start overflow-hidden px-1 pt-1 md:flex-col md:justify-center md:px-2 md:py-1">
        <span className="line-clamp-4 w-full text-sm leading-tight font-semibold md:line-clamp-2 md:text-sm">
          {formatEventTitleWithDateRange(
            event.title,
            event.startDate,
            event.endDate,
          )}
        </span>
      </div>
    </>
  ) : (
    /* Continuation bar — no image, title repeated so multi-week events stay readable */
    <div className="flex min-w-0 items-center px-2 py-1">
      <span className="truncate text-xs leading-tight font-semibold md:text-sm">
        {formatEventTitleWithDateRange(
          event.title,
          event.startDate,
          event.endDate,
        )}
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
  /** Explicit pixel height so the component fills the remaining viewport without
   *  a page-level scrollbar; the calendar grid scrolls internally. */
  calendarHeight?: number;
};

export function EventsCalendarView({ events, calendarHeight }: Props) {
  const locale = useLocale();
  const t = useTranslations("HomePage");

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(now), [now]);
  const [year, setYear] = useState(() => now.getFullYear());
  const [month, setMonth] = useState(() => now.getMonth());

  const [isFullscreen, setIsFullscreen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const weekRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Guard so we only auto-scroll once per mount, not on every data refresh.
  const hasScrolledRef = useRef(false);
  // Set to true by goToToday so the effect below knows to scroll after month state settles.
  const pendingScrollToTodayRef = useRef(false);
  // Tracks whether calendarHeight has been defined at least once since mount.
  // When data is cached, isReadyToScroll is true immediately, but calendarHeight
  // is still undefined while the parent measures the viewport. We must wait for
  // the measured height before scrolling so the container is in its final layout.
  const calendarHeightSettledRef = useRef(calendarHeight !== undefined);
  const [visibleWeekIndex, setVisibleWeekIndex] = useState(0);

  // Fetches all events (including past) for the displayed month.
  // The hook is only enabled for the current month and past months — future months stay empty.
  const { data: monthEvents = [], isFetched: monthEventsFetched } =
    useCalendarMonthEvents(year, month);

  // Whether the displayed month can have historical events (i.e. the query is active).
  const isCurrentOrPast =
    year < now.getFullYear() ||
    (year === now.getFullYear() && month <= now.getMonth());

  // Compute weeks and today's position before effects that depend on them.
  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month]);
  const todayWeekIndex = useMemo(
    () => weeks.findIndex((week) => week.some((day) => isSameDay(day, now))),
    [weeks, now],
  );
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);

  // Scroll today's week row into view once the data is stable.
  // On first open, monthEvents may not be in cache yet, so cell heights aren't
  // final until the fetch completes. Waiting for isFetched (or for a future
  // month where the query is disabled) ensures cell heights are settled before
  // we scroll, fixing the "first time doesn't scroll" bug.
  const isReadyToScroll = !isCurrentOrPast || monthEventsFetched;

  // Mark calendarHeight as settled the moment it becomes defined.
  // React runs effects in declaration order, so this effect always updates the
  // ref before the scroll effect below reads it in the same flush.
  useEffect(() => {
    if (calendarHeight !== undefined) {
      calendarHeightSettledRef.current = true;
    }
  }, [calendarHeight]);

  // calendarHeight is in deps so this re-runs when the parent finishes measuring.
  // The calendarHeightSettledRef guard prevents a premature scroll when data is
  // already cached (isReadyToScroll=true on mount) but the container is still
  // in its temporary max-h layout — fixes the "only scrolls first time" bug.
  useEffect(() => {
    if (!isReadyToScroll) return;
    if (!calendarHeightSettledRef.current) return;
    if (hasScrolledRef.current) return;
    hasScrolledRef.current = true;
    const frame = requestAnimationFrame(() => {
      scrollTodayIntoView(
        scrollContainerRef.current,
        weekRowRefs.current[todayWeekIndex],
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [isReadyToScroll, todayWeekIndex, calendarHeight]);

  // After goToToday() navigates back to the current month, scroll to today's week.
  // This runs whenever year/month settle so the week row refs are up to date.
  useEffect(() => {
    if (!pendingScrollToTodayRef.current) return;
    if (!isReadyToScroll) return;
    pendingScrollToTodayRef.current = false;
    const frame = requestAnimationFrame(() => {
      scrollTodayIntoView(
        scrollContainerRef.current,
        weekRowRefs.current[todayWeekIndex],
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [year, month, isReadyToScroll, todayWeekIndex]);

  // Keep the sticky date row in sync with which week is at the top of the viewport.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function updateVisibleWeek() {
      const containerRect = container!.getBoundingClientRect();
      const threshold = containerRect.top + STICKY_HEADER_PX;
      let idx = 0;
      for (let i = 0; i < weekRowRefs.current.length; i++) {
        const row = weekRowRefs.current[i];
        if (!row) continue;
        // A row is "past" when its bottom clears the sticky header.
        if (row.getBoundingClientRect().bottom <= threshold + 8) {
          idx = Math.min(i + 1, weekRowRefs.current.length - 1);
        } else {
          break;
        }
      }
      setVisibleWeekIndex(idx);
    }

    container.addEventListener("scroll", updateVisibleWeek, { passive: true });
    return () => container.removeEventListener("scroll", updateVisibleWeek);
  }, []);

  // For current/past months, monthEvents is the authoritative source (includes past events).
  // While monthEvents loads, supplement with the already-cached active events to avoid flicker.
  // For future months, monthEvents is empty so we fall back to the active events prop.
  const displayEvents = useMemo(() => {
    if (!isCurrentOrPast) return events;

    const monthIds = new Set(monthEvents.map((e) => e.id));
    const activeNotInMonth = events.filter((e) => !monthIds.has(e.id));
    return [...monthEvents, ...activeNotInMonth];
  }, [events, monthEvents, isCurrentOrPast]);

  const weekDatas = useMemo(
    () => weeks.map((w) => computeWeekSlots(w, displayEvents)),
    [weeks, displayEvents],
  );

  function resetScroll() {
    setVisibleWeekIndex(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
    resetScroll();
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
    resetScroll();
  }

  function goToToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    pendingScrollToTodayRef.current = true;
    resetScroll();
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const isHeightConstrained = !!calendarHeight || isFullscreen;

  return (
    // calendarHeight / isFullscreen: fills remaining viewport space; flex column so
    // month nav takes natural height and grid fills the rest.
    // No calendarHeight: brief fallback before measurement (grid view path).
    <div
      className={cn(
        "w-full",
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-background p-3 sm:p-4"
          : isHeightConstrained
            ? "flex flex-col"
            : "mt-4",
      )}
      style={!isFullscreen && calendarHeight ? { height: calendarHeight } : undefined}
    >
      {/* Full-screen toggle — full-width button above the month nav, mobile only */}
      {isFullscreen ? (
        <Button
          variant="outline"
          onClick={() => setIsFullscreen(false)}
          className="mb-2 flex w-full shrink-0 items-center justify-center gap-2"
        >
          <X className="size-4" aria-hidden />
          {t("closeFullscreen")}
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsFullscreen(true)}
          className="mb-3 flex w-full shrink-0 items-center justify-center gap-2 md:hidden"
        >
          <Maximize2 className="size-4" aria-hidden />
          {t("fullscreen")}
        </Button>
      )}

      {/* Month navigation */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between",
          isHeightConstrained ? "py-2" : "mb-3",
        )}
      >
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

      {/* Calendar grid — flex-1 + min-h-0 when height is constrained; otherwise a
          conservative cap until EventsList finishes layout measurement.         */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "overflow-auto rounded-xl border",
          isHeightConstrained ? "min-h-0 flex-1" : "max-h-[60svh]",
        )}
      >
        <div className="min-w-[650px] md:min-w-0">
          {/* Sticky 2-row header: day names + dates of the current visible week */}
          <div className="sticky top-0 z-10 border-b">
            {/* Row 1 — weekday labels */}
            <div className="bg-muted/90 dark:bg-muted/70 grid grid-cols-7 border-b backdrop-blur-sm">
              {weekdayLabels.map((label, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-muted-foreground py-2 text-center text-[11px] font-semibold tracking-wider uppercase",
                    i < 6 && "border-r",
                  )}
                >
                  {label}
                </div>
              ))}
            </div>
            {/* Row 2 — dates for the topmost visible week */}
            <div className="bg-background/95 dark:bg-background/90 grid grid-cols-7 backdrop-blur-sm">
              {(weeks[visibleWeekIndex] ?? weeks[0])?.map((day, i) => {
                const isDayToday = isSameDay(day, now);
                const dayInMonth = isSameMonth(day, year, month);
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-center py-1",
                      i < 6 && "border-r",
                      !dayInMonth && "bg-muted/20 dark:bg-muted/10",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium select-none",
                        isDayToday
                          ? "bg-primary text-primary-foreground font-semibold"
                          : dayInMonth
                            ? "text-foreground"
                            : "text-muted-foreground/40",
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Week rows */}
          {weekDatas.map((weekData, i) => (
            <WeekRow
              key={i}
              ref={(el) => {
                weekRowRefs.current[i] = el;
              }}
              weekData={weekData}
              year={year}
              month={month}
              today={now}
              todayStr={todayStr}
              showDates={i !== visibleWeekIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
