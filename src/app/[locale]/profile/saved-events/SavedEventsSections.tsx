"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Bookmark, Calendar } from "lucide-react";

import { EventCard } from "~/components/EventCard";
import { EventsGridSkeleton } from "~/components/EventCard/EventCardSkeleton";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useSavedEvents } from "~/hooks/query";
import type { Event } from "~/types";

type Props = {
  userId: string;
  initialUpcoming: Event[];
  savedCount: number;
};

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      </div>
    </div>
  );
}

function EventsGrid({
  events,
  onUnsaveSuccess,
  dimmed = false,
}: {
  events: Event[];
  onUnsaveSuccess: (eventId: number) => void;
  dimmed?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${dimmed ? "opacity-80" : ""}`}
    >
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          initialSaved
          onUnsaveSuccess={onUnsaveSuccess}
        />
      ))}
    </div>
  );
}

export function SavedEventsSections({
  userId,
  initialUpcoming,
  savedCount,
}: Props) {
  const t = useTranslations("SavedEvents");
  const [showPast, setShowPast] = useState(false);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const { data: pastEvents = [], isLoading: isLoadingPast } = useSavedEvents(
    userId,
    "past",
    { enabled: showPast },
  );

  const removedSet = useMemo(() => new Set(removedIds), [removedIds]);
  const upcoming = initialUpcoming.filter((event) => !removedSet.has(event.id));
  const past = pastEvents.filter((event) => !removedSet.has(event.id));
  const hasAnySaved = savedCount - removedIds.length > 0;

  function handleUnsaveSuccess(eventId: number) {
    setRemovedIds((current) =>
      current.includes(eventId) ? current : [...current, eventId],
    );
  }

  if (!hasAnySaved) {
    return (
      <EmptyState
        icon={<Bookmark className="size-5" />}
        title={t("emptyAllTitle")}
        description={t("emptyAllDescription")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
            {t("upcomingTitle")}
          </h2>
        </div>

        {upcoming.length > 0 ? (
          <EventsGrid events={upcoming} onUnsaveSuccess={handleUnsaveSuccess} />
        ) : (
          <EmptyState
            icon={<Calendar className="size-5" />}
            title={t("emptyUpcomingTitle")}
            description={t("emptyUpcomingDescription")}
          />
        )}
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
              {t("pastTitle")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("pastDescription")}
            </p>
          </div>
          {!showPast && (
            <Button variant="outline" onClick={() => setShowPast(true)}>
              {t("showPast")}
            </Button>
          )}
        </div>

        {showPast && isLoadingPast ? (
          <EventsGridSkeleton />
        ) : showPast && past.length > 0 ? (
          <EventsGrid
            events={past}
            onUnsaveSuccess={handleUnsaveSuccess}
            dimmed
          />
        ) : showPast ? (
          <EmptyState
            icon={<Calendar className="size-5" />}
            title={t("emptyPastTitle")}
            description={t("emptyPastDescription")}
          />
        ) : null}
      </section>
    </div>
  );
}
