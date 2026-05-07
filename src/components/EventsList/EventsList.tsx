"use client";

import { useTranslations } from "next-intl";

import { Calendar } from "lucide-react";

import { EventCard } from "~/components/EventCard";
import { EventsGridSkeleton } from "~/components/EventCard/EventCardSkeleton";
import { useActiveEvents, usePastEvents } from "~/hooks/query/events";
import { useFilters } from "~/hooks/useFilters";
import type { Event } from "~/types";

type Variant = "active" | "past";

type Props = {
  initialData: Event[];
  variant: Variant;
};

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

function ActiveEventsList({ initialData }: Omit<Props, "variant">) {
  const { filters } = useFilters();
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
  return <EventsGrid events={events} />;
}

function PastEventsList({ initialData }: Omit<Props, "variant">) {
  const { data: events = [], isLoading } = usePastEvents({}, { initialData });
  if (isLoading && !events.length) return <EventsGridSkeleton />;
  return <EventsGrid events={events} />;
}

function EventsGrid({ events }: { events: Event[] }) {
  if (events.length === 0) return <EmptyState />;

  return (
    <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export function EventsList({ initialData, variant }: Props) {
  if (variant === "active") {
    return <ActiveEventsList initialData={initialData} />;
  }
  return <PastEventsList initialData={initialData} />;
}
