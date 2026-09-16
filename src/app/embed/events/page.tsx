import { cache } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

import { EmbedEventsList } from "~/components/EmbedEvents";
import { DEFAULT_LOCALE, type Locale,LOCALES } from "~/constants";
import { eventsApi } from "~/lib/api";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

const getEmbedEventsCached = cache(() =>
  eventsApi.getEmbedUpcomingEvents(createSupabasePublicServerClient()),
);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseEmbedLocale(raw: string | string[] | undefined): Locale {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && (LOCALES as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const locale = parseEmbedLocale((await searchParams).locale);
  const t = await getTranslations({ locale, namespace: "EmbedEvents" });

  return {
    title: t("iframeTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function EmbedEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = parseEmbedLocale((await searchParams).locale);
  setRequestLocale(locale);

  const [events, messages] = await Promise.all([
    getEmbedEventsCached(),
    getMessages({ locale }),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <EmbedEventsList events={events} locale={locale} siteUrl={siteUrl} />
    </NextIntlClientProvider>
  );
}
