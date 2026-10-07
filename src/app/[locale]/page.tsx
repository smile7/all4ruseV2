import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Plus } from "lucide-react";

import { ArticlesTeaser } from "~/components/ArticlesTeaser";
import { EventsGridSkeleton } from "~/components/EventCard/EventCardSkeleton";
import { EventFiltersBar } from "~/components/EventFilters";
import { EventPeriodNav } from "~/components/EventPeriodNav";
import { EventsList } from "~/components/EventsList";
import { EventTagHubNav } from "~/components/EventTagHubNav";
import { Typography } from "~/components/layout";
import { TrackedLink } from "~/components/TrackedLink";
import { Button } from "~/components/ui/button";
import { ARTICLES_TEASER_COUNT, DEFAULT_LOCALE } from "~/constants";
import { routing } from "~/i18n/routing";
import { articlesApi, eventsApi } from "~/lib/api";
import { serializeJsonLd } from "~/lib/article-jsonld";
import { buildEventCollectionJsonLd } from "~/lib/event-jsonld";
import { formatEventTitle } from "~/lib/event-utils";
import { buildAlternates } from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";
import type { Event, GetEventsParams } from "~/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";
const HOME_LIST_JSON_LD_LIMIT = 30;

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Props = {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
};

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

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, rawParams] = await Promise.all([
    getTranslations({ locale, namespace: "HomePage" }),
    searchParams,
  ]);
  const filtered = hasEventFilters(parseSearchParams(rawParams));
  const title = t("pageTitle");
  const description = t("pageDescription");
  const alternates = buildAlternates(locale);

  return {
    title,
    description,
    // A filtered view is noindex and emits no canonical. Combining noindex with
    // a canonical pointing at a different URL lets Google consolidate the two
    // and apply the noindex to the clean homepage, so the two never ship
    // together.
    ...(filtered
      ? { robots: { index: false, follow: true } }
      : { alternates }),
    openGraph: {
      title,
      description,
      // og:url is a canonical hint. On a noindex filtered URL it must not
      // point at the clean homepage.
      ...(filtered ? {} : { url: alternates.canonical }),
      siteName: "All4Ruse",
      type: "website",
    },
  };
}

export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const filters = parseSearchParams(await searchParams);
  const filtered = hasEventFilters(filters);

  // Public client, not the cookie-bound one: reading cookies here would opt the
  // homepage out of caching, and Googlebot would hit a no-store HTML page on
  // every crawl. Nothing on this page is user-specific.
  const client = createSupabasePublicServerClient();
  let initialData: Event[] = [];
  let totalCount = 0;

  // Articles are fetched alongside the events so the teaser adds no serial latency.
  const articlesPromise = articlesApi.getLatestArticles(
    client,
    locale,
    ARTICLES_TEASER_COUNT,
  );

  if (filtered) {
    const [filteredEvents, allEvents] = await Promise.all([
      eventsApi.getActiveEvents(client, filters),
      eventsApi.getActiveEvents(client),
    ]);
    initialData = filteredEvents;
    totalCount = allEvents.length;
  } else {
    initialData = await eventsApi.getActiveEvents(client, filters);
    totalCount = initialData.length;
  }

  const latestArticles = await articlesPromise;
  const homeUrl = `${siteUrl}/${locale}`;
  const collectionJsonLd =
    !filtered && initialData.length > 0
      ? buildEventCollectionJsonLd({
          url: homeUrl,
          name: t("pageTitle"),
          description: t("pageDescription"),
          items: initialData
            .filter(
              (event): event is Event & { slug: string } =>
                typeof event.slug === "string" && event.slug.length > 0,
            )
            .slice(0, HOME_LIST_JSON_LD_LIMIT)
            .map((event) => ({
              name: formatEventTitle(event.title),
              url: `${siteUrl}/${DEFAULT_LOCALE}/${event.slug}`,
            })),
        })
      : null;

  return (
    <div className="max-w-9xl mx-auto flex w-full flex-col gap-1 px-4 py-6 text-center sm:px-6 lg:px-8">
      {collectionJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(collectionJsonLd),
          }}
        />
      )}
      <Typography.H1 className="text-center text-3xl">
        {t("pageTitle")}
      </Typography.H1>

      <div className="mt-2 flex justify-center">
        <Button asChild variant="outline">
          <TrackedLink eventKey="home.create_event" href="/create-event">
            <Plus className="size-4" />
            {t("createEvent")}
          </TrackedLink>
        </Button>
      </div>

      {/*
        Suspense is required because the filter bar and EventsList internally call
        useSearchParams(). The initialData from SSR ensures the first render shows
        content immediately.
      */}
      <Suspense fallback={<EventsGridSkeleton />}>
        <EventFiltersBar />
        <EventsList
          initialData={initialData}
          totalCount={totalCount}
          variant="active"
        />
      </Suspense>

      {!filtered && (
        <>
          <EventTagHubNav
            events={initialData}
            locale={locale}
            heading={t("browseByCategory")}
          />
          <EventPeriodNav locale={locale} heading={t("browseByDate")} />
        </>
      )}

      <ArticlesTeaser articles={latestArticles} locale={locale} />
    </div>
  );
}
