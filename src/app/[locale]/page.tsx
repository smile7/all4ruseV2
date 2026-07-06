import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { Plus } from "lucide-react";

import { EventsGridSkeleton } from "~/components/EventCard/EventCardSkeleton";
import { EventsList } from "~/components/EventsList";
import { Typography } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";
import { eventsApi } from "~/lib/api";
import { buildAlternates } from "~/lib/seo";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import type { Event, GetEventsParams } from "~/types";

export async function generateMetadata() {
  const [t, locale] = await Promise.all([
    getTranslations("HomePage"),
    getLocale(),
  ]);
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: buildAlternates(locale),
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): Partial<GetEventsParams> {
  const str = (key: string) => {
    const v = raw[key];
    return typeof v === "string" ? v.trim() : undefined;
  };

  const tagsRaw = str("tags");
  const tagIds = tagsRaw
    ?.split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);

  return {
    search: str("search") || undefined,
    tagIds: tagIds?.length ? tagIds : undefined,
    from: str("from") || undefined,
    to: str("to") || undefined,
    isFree: raw.isFree === "true" ? true : undefined,
    host: str("host") || undefined,
    place: str("place") || undefined,
  };
}

function hasEventFilters(params: Partial<GetEventsParams>): boolean {
  return Boolean(
    params.search ||
    params.tagIds?.length ||
    params.from ||
    params.to ||
    params.isFree ||
    params.host ||
    params.place,
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("HomePage");
  const params = parseSearchParams(await searchParams);

  const client = await createSupabaseServerClient();
  let initialData: Event[] = [];
  let totalCount = 0;
  if (hasEventFilters(params)) {
    const [filteredEvents, allEvents] = await Promise.all([
      eventsApi.getActiveEvents(client, params),
      eventsApi.getActiveEvents(client),
    ]);
    initialData = filteredEvents;
    totalCount = allEvents.length;
  } else {
    initialData = await eventsApi.getActiveEvents(client, params);
    totalCount = initialData.length;
  }

  return (
    <div className="max-w-9xl mx-auto flex w-full flex-col gap-1 px-4 py-6 text-center sm:px-6 lg:px-8">
      <Typography.H1 className="text-center text-3xl">
        {t("pageTitle")}
      </Typography.H1>

      <div className="mt-2 flex justify-center">
        <Button asChild variant="outline">
          <Link href="/create-event">
            <Plus className="size-4" />
            {t("createEvent")}
          </Link>
        </Button>
      </div>

      {/*
        Suspense is required because EventsList internally calls useSearchParams().
        The initialData from SSR ensures the first render shows content immediately.
      */}
      <Suspense fallback={<EventsGridSkeleton />}>
        <EventsList
          initialData={initialData}
          totalCount={totalCount}
          variant="active"
        />
      </Suspense>
    </div>
  );
}
