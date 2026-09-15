import { cache } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EventCard } from "~/components/EventCard";
import { Typography } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { DEFAULT_LOCALE } from "~/constants";
import { Link } from "~/i18n/navigation";
import { routing } from "~/i18n/routing";
import { eventsApi } from "~/lib/api";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "~/lib/article-jsonld";
import { buildEventCollectionJsonLd } from "~/lib/event-jsonld";
import { formatEventTitle } from "~/lib/event-utils";
import { buildAlternates, truncateForMeta } from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

const FREE_EVENTS_PATH = "/free";

const getFreeEventsCached = cache(() =>
  eventsApi.getActiveEvents(createSupabasePublicServerClient(), {
    isFree: true,
  }),
);

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FreeEvents" });

  const title = t("pageTitle");
  const description = truncateForMeta(t("pageDescription"));

  return {
    title,
    description,
    alternates: buildAlternates(locale, FREE_EVENTS_PATH),
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}${FREE_EVENTS_PATH}`,
      siteName: "All4Ruse",
      type: "website",
    },
  };
}

export default async function FreeEventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "FreeEvents" });
  const events = await getFreeEventsCached();

  const pageUrl = `${siteUrl}/${locale}${FREE_EVENTS_PATH}`;

  const collectionJsonLd =
    events.length > 0
      ? buildEventCollectionJsonLd({
          url: pageUrl,
          name: t("pageTitle"),
          description: t("pageDescription"),
          items: events
            .filter(
              (event): event is typeof event & { slug: string } =>
                typeof event.slug === "string" && event.slug.length > 0,
            )
            .map((event) => ({
              name: formatEventTitle(event.title),
              url: `${siteUrl}/${DEFAULT_LOCALE}/${event.slug}`,
            })),
        })
      : null;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("breadcrumbHome"), url: `${siteUrl}/${locale}` },
    { name: t("pageTitle"), url: pageUrl },
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-2 px-4 py-8 text-center sm:px-6 lg:px-8">
      {collectionJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(collectionJsonLd),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      <Typography.H1 className="text-center">{t("pageTitle")}</Typography.H1>
      <p className="text-muted-foreground mx-auto max-w-2xl text-sm">
        {t("intro")}
      </p>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          {/* Further narrowing happens on the home filter, which stays noindex. */}
          <Link href={{ pathname: "/", query: { isFree: "true" } }}>
            {t("combineFilters")}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">{t("browseAll")}</Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground mt-10">{t("empty")}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
