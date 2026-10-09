import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Loader2 } from "lucide-react";

import { EventsMapView } from "~/components/EventsMap/EventsMapView";
import { routing } from "~/i18n/routing";
import { eventsApi } from "~/lib/api";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const revalidate = 43200;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  return {
    title: t("mapView"),
    // Not a landing page, but it links to every event — let crawlers follow
    // through. No canonical: this URL is noindex, and pointing it at the
    // homepage asks Google to consolidate the two.
    robots: { index: false, follow: true },
  };
}

export default async function MapPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const client = createSupabasePublicServerClient();
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
