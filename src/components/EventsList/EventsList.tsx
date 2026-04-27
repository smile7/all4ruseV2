"use client";

import { useTranslations } from "next-intl";

import { Calendar } from "lucide-react";

import { EventCard } from "~/components/EventCard";
import { useActiveEvents, usePastEvents } from "~/hooks/query/events";
import type { Event, GetEventsParams } from "~/types";

type Variant = "active" | "past";

type Props = {
  initialData: Event[];
  variant: Variant;
  // params will be wired in 2.6 when EventFilters are added
  params?: Partial<GetEventsParams>;
};

function EmptyState() {
  const t = useTranslations("HomePage");
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Calendar className="text-muted-foreground size-10 opacity-40" strokeWidth={1.5} />
      <p className="text-muted-foreground text-sm">{t("noEvents")}</p>
    </div>
  );
}

function ActiveEventsList({ initialData, params = {} }: Omit<Props, "variant">) {
  const { data: events = [] } = useActiveEvents(params, { initialData });
  return <EventsGrid events={events} />;
}

function PastEventsList({ initialData, params = {} }: Omit<Props, "variant">) {
  const { data: events = [] } = usePastEvents(params, { initialData });
  return <EventsGrid events={events} />;
}

function EventsGrid({ events }: { events: Event[] }) {
  if (events.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 gap-8 mt-12 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export function EventsList({ initialData, variant, params }: Props) {
  if (variant === "active") {
    return <ActiveEventsList initialData={initialData} params={params} />;
  }
  return <PastEventsList initialData={initialData} params={params} />;
}
