import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EventCard } from "~/components/EventCard";
import { EventPeriodNav } from "~/components/EventPeriodNav";
import { Typography } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { DEFAULT_LOCALE, MIN_INDEXABLE_PERIOD_EVENTS } from "~/constants";
import { Link } from "~/i18n/navigation";
import { routing } from "~/i18n/routing";
import { eventsApi } from "~/lib/api";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "~/lib/article-jsonld";
import { buildEventCollectionJsonLd } from "~/lib/event-jsonld";
import {
  type EventPeriod,
  eventPeriodMonthAnchor,
  eventPeriodPath,
  eventPeriodSlugs,
  resolveEventPeriod,
} from "~/lib/event-periods";
import {
  formatEventMonthHeading,
  formatEventTitle,
  parseLocalDate,
} from "~/lib/event-utils";
import { buildAlternates, truncateForMeta } from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

// "today" and "weekend" shift with the Sofia calendar day, so this one cannot
// go to a full day. Event edits arrive instantly via /api/seo/notify.
export const revalidate = 10800;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

const getPeriodEventsCached = cache((from: string, to: string) =>
  eventsApi.getActiveEvents(createSupabasePublicServerClient(), { from, to }),
);

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    eventPeriodSlugs().map((period) => ({ locale, period })),
  );
}

type Props = {
  params: Promise<{ locale: string; period: string }>;
};

/** Heading, meta description and intro all vary by period kind. */
function periodCopy(
  period: EventPeriod,
  locale: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  if (period.kind === "month") {
    const month = formatEventMonthHeading(
      eventPeriodMonthAnchor(period),
      locale,
    );
    const year = parseLocalDate(eventPeriodMonthAnchor(period)).getFullYear();
    return {
      title: t("monthTitle", { month, year }),
      description: t("monthDescription", { month, year }),
      intro: t("monthIntro", { month, year }),
    };
  }

  const prefix = period.kind === "today" ? "today" : "weekend";
  return {
    title: t(`${prefix}Title`),
    description: t(`${prefix}Description`),
    intro: t(`${prefix}Intro`),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, period: slug } = await params;
  const period = resolveEventPeriod(slug);
  if (!period) return {};

  const t = await getTranslations({ locale, namespace: "EventPeriodPage" });
  const events = await getPeriodEventsCached(period.from, period.to);
  const copy = periodCopy(period, locale, t);

  return {
    title: copy.title,
    description: truncateForMeta(copy.description),
    alternates: buildAlternates(locale, eventPeriodPath(slug)),
    // These pages overlap the homepage, so a sparse one is near-duplicate
    // content. Same threshold as the tag hubs.
    ...(events.length < MIN_INDEXABLE_PERIOD_EVENTS
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title: copy.title,
      description: truncateForMeta(copy.description),
      url: `${siteUrl}/${locale}${eventPeriodPath(slug)}`,
      siteName: "All4Ruse",
      type: "website",
    },
  };
}

export default async function EventPeriodPage({ params }: Props) {
  const { locale, period: slug } = await params;
  setRequestLocale(locale);

  const period = resolveEventPeriod(slug);
  if (!period) notFound();

  const t = await getTranslations({ locale, namespace: "EventPeriodPage" });
  const events = await getPeriodEventsCached(period.from, period.to);
  const copy = periodCopy(period, locale, t);
  const pageUrl = `${siteUrl}/${locale}${eventPeriodPath(slug)}`;

  const collectionJsonLd =
    events.length > 0
      ? buildEventCollectionJsonLd({
          url: pageUrl,
          name: copy.title,
          description: copy.description,
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
    { name: copy.title, url: pageUrl },
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

      <Typography.H1 className="text-center">{copy.title}</Typography.H1>
      <p className="text-muted-foreground mx-auto max-w-2xl text-sm">
        {copy.intro}
      </p>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
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

      <EventPeriodNav
        locale={locale}
        currentSlug={slug}
        heading={t("otherPeriods")}
      />
    </div>
  );
}
