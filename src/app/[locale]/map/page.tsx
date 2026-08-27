import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { Loader2 } from "lucide-react";

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
    <div className="max-w-9xl mx-auto flex w-full flex-col px-4 pt-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex min-h-80 items-center justify-center">
            <Loader2
              className="text-muted-foreground size-6 animate-spin"
              aria-hidden
            />
          </div>
        }
      >
        <EventsMapView events={events} from="" to="" />
      </Suspense>
    </div>
  );
}
