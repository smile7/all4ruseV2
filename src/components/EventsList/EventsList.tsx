"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { ArrowUpToLineIcon, Calendar } from "lucide-react";

import { EventCard } from "~/components/EventCard";
import { EventsGridSkeleton } from "~/components/EventCard/EventCardSkeleton";
import { Button } from "~/components/ui/button";
import { useActiveEvents, useCurrentEvents, usePastEvents } from "~/hooks/query/events";
import { useFilters } from "~/hooks/useFilters";
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

function groupEventsByMonth(events: Event[], locale: string): EventMonthGroup[] {
  const currentMonthKey = getCurrentMonthKey();

  return events.reduce<EventMonthGroup[]>((groups, event) => {
    const date = parseLocalDate(event.startDate);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const existingGroup = groups.at(-1);

    if (existingGroup?.monthKey === monthKey) {
      existingGroup.events.push(event);
      return groups;
    }

    groups.push({
      key: `${monthKey}-${groups.length}`,
      monthKey,
      label: formatEventMonthHeading(event.startDate, locale),
      showHeading: monthKey !== currentMonthKey,
      events: [event],
    });
    return groups;
  }, []);
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
      className="fixed right-4 bottom-20 z-50 size-11 rounded-full shadow-lg md:right-6 md:bottom-16 bg-secondary/70 hover:bg-secondary"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUpToLineIcon className="size-5" aria-hidden />
    </Button>
  );
}

function ActiveEventsList({
  initialData,
  totalCount,
}: Omit<Props, "variant">) {
  const t = useTranslations("HomePage");
  const { filters, hasActiveFilters } = useFilters();
  const params = {
    search: filters.search || undefined,
    tagIds: filters.tagIds.length ? filters.tagIds : undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    isFree: filters.isFree || undefined,
    host: filters.host || undefined,
    place: filters.place || undefined,
  };
  const { data: events = [], isLoading } = useActiveEvents(params, {
    initialData,
  });

  if (isLoading && !events.length) return <EventsGridSkeleton />;
  return (
    <>
      <p className="text-muted-foreground mt-4 text-sm text-left">
        {hasActiveFilters
          ? t("filteredEventsSummary", {
              filtered: events.length,
              total: totalCount ?? events.length,
            })
          : t("allEventsSummary", { count: events.length })}
      </p>
      <EventsGrid events={events} groupByMonth />
    </>
  );
}

function CurrentEventsList({ initialData }: Omit<Props, "variant">) {
  const { data: events = [], isLoading } = useCurrentEvents({}, { initialData });
  if (isLoading && !events.length) return <EventsGridSkeleton />;
  return <EventsGrid events={events} />;
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
