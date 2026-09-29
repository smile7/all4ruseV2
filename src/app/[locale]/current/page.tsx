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

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CurrentEvents" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: buildAlternates(locale, "/current"),
  };
}

export default async function CurrentEventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "CurrentEvents" });

  // Public client, not the cookie-bound one: reading cookies here would opt the
  // page out of static rendering, and nothing on it is user-specific.
  const initialData = await eventsApi.getCurrentEvents(
    createSupabasePublicServerClient(),
    {},
  );

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-2 px-4 py-8 text-center sm:px-6 lg:px-8">
      <Typography.H1 className="text-center">{t("pageTitle")}</Typography.H1>
      <Suspense fallback={<EventsGridSkeleton />}>
        <EventsList initialData={initialData} variant="current" />
      </Suspense>
    </div>
  );
}
