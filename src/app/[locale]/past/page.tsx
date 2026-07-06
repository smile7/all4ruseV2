import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { EventsGridSkeleton } from "~/components/EventCard/EventCardSkeleton";
import { EventsList } from "~/components/EventsList";
import { Typography } from "~/components/layout";
import { eventsApi } from "~/lib/api";
import { buildAlternates } from "~/lib/seo";
import { createSupabaseServerClient } from "~/lib/supabase/server";

export async function generateMetadata() {
  const [t, locale] = await Promise.all([
    getTranslations("PastEvents"),
    getLocale(),
  ]);
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: buildAlternates(locale, "/past"),
  };
}

export default async function PastEventsPage() {
  const t = await getTranslations("PastEvents");

  const client = await createSupabaseServerClient();
  const initialData = await eventsApi.getPastEvents(client, {});

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-2 px-4 py-8 text-center sm:px-6 lg:px-8">
      <Typography.H1 className="text-center">{t("pageTitle")}</Typography.H1>
      <Suspense fallback={<EventsGridSkeleton />}>
        <EventsList initialData={initialData} variant="past" />
      </Suspense>
    </div>
  );
}
