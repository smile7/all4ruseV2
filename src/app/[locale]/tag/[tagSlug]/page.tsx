import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

import { EventCard } from "~/components/EventCard";
import { EventTag } from "~/components/EventTag";
import { Typography } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { DEFAULT_LOCALE, MIN_INDEXABLE_TAG_EVENTS } from "~/constants";
import { localizedEventTagTitle } from "~/i18n/event-tag-label";
import { Link } from "~/i18n/navigation";
import { routing } from "~/i18n/routing";
import { eventsApi, tagsApi } from "~/lib/api";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "~/lib/article-jsonld";
import { buildEventCollectionJsonLd } from "~/lib/event-jsonld";
import { eventTagSlug, findEventTagBySlug } from "~/lib/event-tag-slug";
import { formatEventTagDisplayLabel } from "~/lib/event-tag-styles";
import { formatEventTitle } from "~/lib/event-utils";
import { buildAlternates, truncateForMeta } from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

/** Related tags shown under the list, purely for internal linking. */
const RELATED_TAG_COUNT = 12;

const getTagsCached = cache(() =>
  tagsApi.getTags(createSupabasePublicServerClient()),
);

const getTagEventsCached = cache((tagId: number) =>
  eventsApi.getActiveEvents(createSupabasePublicServerClient(), {
    tagIds: [tagId],
  }),
);

type Props = {
  params: Promise<{ locale: string; tagSlug: string }>;
};

export async function generateStaticParams() {
  try {
    const tags = await getTagsCached();
    return routing.locales.flatMap((locale) =>
      tags
        .map((tag) => ({ locale, tagSlug: eventTagSlug(tag.title) }))
        .filter((entry) => entry.tagSlug !== ""),
    );
  } catch {
    // A DB hiccup at build time must not fail the deploy; ISR fills these in.
    return [];
  }
}

async function resolve(locale: string, tagSlug: string) {
  const tags = await getTagsCached();
  const tag = findEventTagBySlug(tags, tagSlug);
  if (!tag) return null;

  const [events, messages] = await Promise.all([
    getTagEventsCached(tag.id),
    getMessages({ locale }),
  ]);

  const eventTagLabels = (messages as { EventTags?: Record<string, string> })
    .EventTags;
  const label = formatEventTagDisplayLabel(
    localizedEventTagTitle(tag.title, eventTagLabels),
  );

  return { tag, tags, events, label, eventTagLabels };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, tagSlug } = await params;
  const resolved = await resolve(locale, tagSlug);
  if (!resolved) return {};

  const t = await getTranslations({ locale, namespace: "EventTagPage" });
  const { label, events } = resolved;

  const title = t("pageTitle", { tag: label });
  const description = truncateForMeta(t("pageDescription", { tag: label }));

  return {
    title,
    description,
    alternates: buildAlternates(
      locale,
      `/tag/${eventTagSlug(resolved.tag.title)}`,
    ),
    // Thin pages stay reachable and keep passing link equity, but out of the index.
    ...(events.length < MIN_INDEXABLE_TAG_EVENTS
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/tag/${eventTagSlug(resolved.tag.title)}`,
      siteName: "All4Ruse",
      type: "website",
    },
  };
}

export default async function EventTagPage({ params }: Props) {
  const { locale, tagSlug } = await params;
  setRequestLocale(locale);

  const resolved = await resolve(locale, tagSlug);
  if (!resolved) notFound();

  const { tag, tags, events, label, eventTagLabels } = resolved;
  const t = await getTranslations({ locale, namespace: "EventTagPage" });

  const canonicalSlug = eventTagSlug(tag.title);
  const pageUrl = `${siteUrl}/${locale}/tag/${canonicalSlug}`;
  const heading = t("heading", { tag: label });

  const collectionJsonLd =
    events.length > 0
      ? buildEventCollectionJsonLd({
          url: pageUrl,
          name: heading,
          description: t("pageDescription", { tag: label }),
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
    { name: heading, url: pageUrl },
  ]);

  const relatedTags = tags
    .filter((other) => other.id !== tag.id)
    .slice(0, RELATED_TAG_COUNT);

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

      <Typography.H1 className="text-center">{heading}</Typography.H1>
      <p className="text-muted-foreground mx-auto max-w-2xl text-sm">
        {t("intro", { tag: label })}
      </p>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          {/* Multi-tag selection lives on the home filter, which stays noindex. */}
          <Link href={{ pathname: "/", query: { tags: String(tag.id) } }}>
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

      {relatedTags.length > 0 && (
        <nav aria-label={t("otherTags")} className="mt-12">
          <Typography.H2 className="mb-3 text-base">
            {t("otherTags")}
          </Typography.H2>
          <div className="flex flex-wrap justify-center gap-2">
            {relatedTags.map((other) => (
              <EventTag
                key={other.id}
                title={other.title ?? ""}
                label={formatEventTagDisplayLabel(
                  localizedEventTagTitle(other.title, eventTagLabels),
                )}
                size="md"
                href={`/tag/${eventTagSlug(other.title)}`}
              />
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
