"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";

import {
  ArrowUpToLineIcon,
  Calendar,
  CalendarDays,
  LayoutGrid,
  RefreshCw,
} from "lucide-react";

import { EventCard } from "~/components/EventCard";
import { EventsGridSkeleton } from "~/components/EventCard/EventCardSkeleton";

// Loaded only when the user switches to the calendar tab (~615 lines + CSS).
// Keeping it out of the initial bundle improves first-load JS size.
const EventsCalendarView = dynamic(
  () =>
    import("~/components/EventsCalendar/EventsCalendarView").then(
      (m) => m.EventsCalendarView,
    ),
  { ssr: false },
);
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  useActiveEvents,
  useCurrentEvents,
  usePastEvents,
} from "~/hooks/query/events";
import { useFilters } from "~/hooks/useFilters";
import { useViewPreference } from "~/hooks/useViewPreference";
import { useRouter } from "~/i18n/navigation";
import { formatEventMonthHeading, parseLocalDate } from "~/lib/event-utils";
import type { Event } from "~/types";

type Variant = "active" | "current" | "past";

type Props = {
  initialData: Event[];
  totalCount?: number;
  variant: Variant;
};

type EventMonthGroup = {
  key: string;
  monthKey: string;
  label: string;
  showHeading: boolean;
  events: Event[];
};

const BACK_TO_TOP_SCROLL_THRESHOLD = 360;

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}`;
}

function compareUpcomingEvents(left: Event, right: Event): number {
  const premiumDiff =
    Number(right.isEventPremium === true) -
    Number(left.isEventPremium === true);

  if (premiumDiff !== 0) return premiumDiff;

  const startDateDiff = left.startDate.localeCompare(right.startDate);
  if (startDateDiff !== 0) return startDateDiff;

  const startTimeDiff = (left.startTime ?? "").localeCompare(
    right.startTime ?? "",
  );
  if (startTimeDiff !== 0) return startTimeDiff;

  return left.id - right.id;
}

function groupEventsByMonth(
  events: Event[],
  locale: string,
): EventMonthGroup[] {
  const currentMonthKey = getCurrentMonthKey();

  const groupsByMonth = new Map<
    string,
    {
      monthOrder: number;
      label: string;
      showHeading: boolean;
      premiumEvents: Event[];
      regularEvents: Event[];
    }
  >();

  for (const event of events) {
    const date = parseLocalDate(event.startDate);
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthKey = `${year}-${month}`;
    const existingGroup = groupsByMonth.get(monthKey);

    if (existingGroup) {
      if (event.isEventPremium) {
        existingGroup.premiumEvents.push(event);
      } else {
        existingGroup.regularEvents.push(event);
      }
      continue;
    }

    groupsByMonth.set(monthKey, {
      monthOrder: year * 12 + month,
      label: formatEventMonthHeading(event.startDate, locale),
      showHeading: monthKey !== currentMonthKey,
      premiumEvents: event.isEventPremium ? [event] : [],
      regularEvents: event.isEventPremium ? [] : [event],
    });
  }

  return Array.from(groupsByMonth.entries())
    .sort(([, left], [, right]) => left.monthOrder - right.monthOrder)
    .map(([monthKey, group], index) => ({
      key: `${monthKey}-${index}`,
      monthKey,
      label: group.label,
      showHeading: group.showHeading,
      events: [...group.premiumEvents, ...group.regularEvents].sort(
        compareUpcomingEvents,
      ),
    }));
}

function EmptyState() {
  const t = useTranslations("HomePage");
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Calendar
        className="text-muted-foreground size-10 opacity-40"
        strokeWidth={1.5}
      />
      <p className="text-muted-foreground text-sm">{t("noEvents")}</p>
    </div>
  );
}

function BackToTopButton() {
  const t = useTranslations("HomePage");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > BACK_TO_TOP_SCROLL_THRESHOLD);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label={t("backToTop")}
      className="bg-secondary/70 hover:bg-secondary fixed right-4 bottom-20 z-50 size-11 rounded-full shadow-lg md:right-6 md:bottom-16"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUpToLineIcon className="size-5" aria-hidden />
    </Button>
  );
}

function ActiveEventsList({ initialData, totalCount }: Omit<Props, "variant">) {
  const t = useTranslations("HomePage");
  const router = useRouter();
  const { filters, hasActiveFilters } = useFilters();
  const [view, setView] = useViewPreference("grid");
  // Ref marks the top edge of the calendar slot so we can measure remaining space.
  const calendarSlotRef = useRef<HTMLDivElement>(null);
  const [calendarHeight, setCalendarHeight] = useState<number | null>(null);

  const params = {
    search: filters.search || undefined,
    tagIds: filters.tagIds.length ? filters.tagIds : undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    isFree: filters.isFree || undefined,
    host: filters.host || undefined,
    place: filters.place || undefined,
  };
  const {
    data: events = [],
    isLoading,
    isFetching,
    refetch,
  } = useActiveEvents(params, {
    initialData,
  });

  // When the user applies any filter while in calendar view, switch to grid
  // automatically — the calendar doesn't filter events visually.
  useEffect(() => {
    if (hasActiveFilters && view === "calendar") {
      setView("grid");
    }
  }, [hasActiveFilters, view, setView]);

  // In calendar view: measure the calendar slot's viewport-top, fill the remaining
  // space down to the bottom chrome (mobile nav or desktop footer), then lock page
  // scroll so only the calendar grid scrolls internally.
  useEffect(() => {
    if (view !== "calendar") {
      document.documentElement.style.overflow = "";
      const frame = requestAnimationFrame(() => setCalendarHeight(null));
      return () => cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0 });

    let frameId = -1;
    let cancelled = false;

    function getBottomChromeHeight(): number {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) {
        return (
          document.querySelector<HTMLElement>("nav.fixed")?.offsetHeight ?? 0
        );
      }
      return (
        document.querySelector<HTMLElement>("footer.fixed")?.offsetHeight ?? 0
      );
    }

    function measure() {
      if (cancelled || !calendarSlotRef.current) return;

      // On mobile (especially iOS), momentum scrolling can prevent scrollTo from
      // settling synchronously. Re-issue scroll and retry until the page is truly
      // at the top so overflow:hidden doesn't freeze the title out of view.
      if (window.scrollY !== 0) {
        window.scrollTo({ top: 0 });
        frameId = requestAnimationFrame(measure);
        return;
      }

      const slotTop = calendarSlotRef.current.getBoundingClientRect().top;
      const height = window.innerHeight - slotTop - getBottomChromeHeight();
      if (height > 100) {
        document.documentElement.style.overflow = "hidden";
        setCalendarHeight(height);
      }
    }

    // Double-rAF: first frame lets the browser process the scrollTo; second
    // frame measures with a fully-settled layout and scroll position.
    frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(measure);
    });

    window.addEventListener("resize", measure);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", measure);
      document.documentElement.style.overflow = "";
      setCalendarHeight(null);
    };
  }, [view]);

  if (isLoading && !events.length) return <EventsGridSkeleton />;

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-left text-sm">
          {hasActiveFilters
            ? t("filteredEventsSummary", {
                filtered: events.length,
                total: totalCount ?? events.length,
              })
            : t("allEventsSummary", { count: events.length })}
        </p>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={t("refreshEvents")}
          aria-busy={isFetching}
          className="text-muted-foreground size-8 shrink-0 md:hidden"
          onClick={() => {
            if (isFetching) return;
            void refetch();
            router.refresh();
          }}
        >
          <RefreshCw
            className={`size-4 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden
          />
        </Button>
      </div>

      <Tabs
        value={view}
        onValueChange={(v) => setView(v as "grid" | "calendar")}
        className="w-full"
      >
        <TabsList className="h-9 w-full gap-1 p-[3px]">
          <TabsTrigger
            value="grid"
            className="data-[state=inactive]:text-primary! flex-1 gap-2 px-3 text-xs"
          >
            <LayoutGrid className="size-3.5" aria-hidden />
            {t("gridView")}
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="data-[state=inactive]:text-primary! flex-1 gap-2 px-3 text-xs"
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {t("calendarView")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* calendarSlotRef marks where the calendar starts so we can measure height */}
      <div ref={calendarSlotRef}>
        {view === "calendar" ? (
          <EventsCalendarView
            events={events}
            calendarHeight={calendarHeight ?? undefined}
            onClose={() => setView("grid")}
          />
        ) : (
          <EventsGrid events={events} groupByMonth />
        )}
      </div>
    </div>
  );
}

function CurrentEventsList({ initialData }: Omit<Props, "variant">) {
  const { data: events = [], isLoading } = useCurrentEvents(
    {},
    { initialData },
  );
  const sortedEvents = useMemo(
    () => [...events].sort(compareUpcomingEvents),
    [events],
  );

  if (isLoading && !events.length) return <EventsGridSkeleton />;
  return <EventsGrid events={sortedEvents} />;
}

function PastEventsList({ initialData }: Omit<Props, "variant">) {
  const { data: events = [], isLoading } = usePastEvents({}, { initialData });
  if (isLoading && !events.length) return <EventsGridSkeleton />;
  return <EventsGrid events={events} />;
}

function EventsGrid({
  events,
  groupByMonth = false,
}: {
  events: Event[];
  groupByMonth?: boolean;
}) {
  const locale = useLocale();
  const monthGroups = useMemo(
    () => groupEventsByMonth(events, locale),
    [events, locale],
  );

  if (events.length === 0) return <EmptyState />;

  if (!groupByMonth) {
    return (
      <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-14">
      {monthGroups.map((group) => (
        <section key={group.key} className="text-left">
          {group.showHeading && (
            <h2 className="border-border text-foreground mb-5 border-b pb-3 text-xl font-semibold tracking-tight">
              {group.label}
            </h2>
          )}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function EventsList({ initialData, totalCount, variant }: Props) {
  const list =
    variant === "active" ? (
      <ActiveEventsList initialData={initialData} totalCount={totalCount} />
    ) : variant === "current" ? (
      <CurrentEventsList initialData={initialData} />
    ) : (
      <PastEventsList initialData={initialData} />
    );

  return (
    <>
      {list}
      <BackToTopButton />
    </>
  );
}
