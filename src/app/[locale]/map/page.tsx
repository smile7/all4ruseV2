import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { EventsMapView } from "~/components/EventsMap/EventsMapView";
import { eventsApi } from "~/lib/api";
import { buildAlternates } from "~/lib/seo";
import { createSupabaseServerClient } from "~/lib/supabase/server";

export async function generateMetadata() {
  const [t, locale] = await Promise.all([
    getTranslations("HomePage"),
    getLocale(),
  ]);
  return {
    title: t("mapView"),
    robots: "noindex, nofollow", // Hidden from search engines
    alternates: buildAlternates(locale),
  };
}

export default async function MapPage() {
  const client = await createSupabaseServerClient();
  // Fetch active events just like the home page
  const events = await eventsApi.getActiveEvents(client, {});

  return (
    <div className="max-w-9xl mx-auto flex h-[calc(100vh-8rem)] w-full flex-col px-4 py-6 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="flex h-full items-center justify-center">Loading map...</div>}>
        <EventsMapView
          events={events}
          from=""
          to=""
          mapHeight={undefined}
        />
      </Suspense>
    </div>
  );
}
