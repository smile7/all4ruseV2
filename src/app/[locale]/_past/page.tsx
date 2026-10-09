import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EventsGridSkeleton } from "~/components/EventCard/EventCardSkeleton";
import { EventsList } from "~/components/EventsList";
import { Typography } from "~/components/layout";
import { routing } from "~/i18n/routing";
import { eventsApi } from "~/lib/api";
import { buildAlternates } from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

// An archive — its contents only change as events roll past their end date.
export const revalidate = 21600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PastEvents" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: buildAlternates(locale, "/past"),
  };
}

export default async function PastEventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "PastEvents" });

  // Public client, not the cookie-bound one: reading cookies here would opt the
  // page out of static rendering, and nothing on it is user-specific. This page
  // is also the crawl entry point for the event archive, so it must stay cheap.
  const initialData = await eventsApi.getPastEvents(
    createSupabasePublicServerClient(),
    {},
  );

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-2 px-4 py-8 text-center sm:px-6 lg:px-8">
      <Typography.H1 className="text-center">{t("pageTitle")}</Typography.H1>
      <Suspense fallback={<EventsGridSkeleton />}>
        <EventsList initialData={initialData} variant="past" />
      </Suspense>
    </div>
  );
}
