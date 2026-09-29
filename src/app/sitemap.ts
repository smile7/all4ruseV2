import type { MetadataRoute } from "next";

import {
  DEFAULT_LOCALE,
  LOCALES,
  MIN_INDEXABLE_PERIOD_EVENTS,
  MIN_INDEXABLE_TAG_EVENTS,
} from "~/constants";
import { articlesApi, eventsApi, profilesApi, tagsApi } from "~/lib/api";
import {
  eventPeriodPath,
  eventPeriodSlugs,
  resolveEventPeriod,
} from "~/lib/event-periods";
import { eventTagSlug } from "~/lib/event-tag-slug";
import { todayInSofia } from "~/lib/event-utils";
import { ARTICLES_PATH, LOCALE_TO_HREFLANG } from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

/**
 * Emits `<xhtml:link rel="alternate" hreflang="…">` next to each URL. Google
 * only trusts a hreflang cluster when every version declares the whole set, and
 * the sitemap is the cheapest place to do that for pages that exist in all four
 * locales.
 */
function localeAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[LOCALE_TO_HREFLANG[locale] ?? locale] =
      `${siteUrl}/${locale}${path}`;
  }
  languages["x-default"] = `${siteUrl}/${DEFAULT_LOCALE}${path}`;
  return { languages };
}

function addIsoDays(isoDate: string, days: number): string {
  const shifted = new Date(`${isoDate}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

// Dynamic listing pages: content changes daily so lastModified = now is accurate.
const DYNAMIC_PATHS = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/current", priority: 0.85, changeFrequency: "daily" as const },
  { path: "/past", priority: 0.85, changeFrequency: "daily" as const },
  { path: "/free", priority: 0.9, changeFrequency: "daily" as const },
];

// Static/editorial pages: use the date the content was last meaningfully edited.
// Update these dates whenever the page copy changes.
const STATIC_PATHS = [
  {
    path: "/why-all4ruse",
    priority: 0.8,
    changeFrequency: "monthly" as const,
    lastModified: new Date("2026-08-06"),
  },
  {
    path: "/advertise",
    priority: 0.8,
    changeFrequency: "monthly" as const,
    lastModified: new Date("2026-08-06"),
  },
  {
    path: "/legal/terms",
    priority: 0.3,
    changeFrequency: "yearly" as const,
    lastModified: new Date("2026-01-26"),
  },
  {
    path: "/legal/privacy",
    priority: 0.3,
    changeFrequency: "yearly" as const,
    lastModified: new Date("2026-01-26"),
  },
  {
    path: "/legal/cookies",
    priority: 0.3,
    changeFrequency: "yearly" as const,
    lastModified: new Date("2026-01-26"),
  },
  {
    path: "/legal/gdpr",
    priority: 0.3,
    changeFrequency: "yearly" as const,
    lastModified: new Date("2026-01-26"),
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = createSupabasePublicServerClient();
  const [slugsWithDates, usernames, articleEntries, tags, upcomingEvents] =
    await Promise.all([
      eventsApi.getAllSlugsWithDates(client),
      profilesApi.getIndexableUsernames(client),
      articlesApi.getArticleSitemapEntries(client),
      tagsApi.getTags(client).catch(() => []),
      eventsApi.getActiveEvents(client).catch(() => []),
    ]);

  // Mirrors the noindex rule on the tag page itself.
  const upcomingCountByTagId = new Map<number, number>();
  for (const event of upcomingEvents) {
    for (const tag of event.tags ?? []) {
      upcomingCountByTagId.set(
        tag.id,
        (upcomingCountByTagId.get(tag.id) ?? 0) + 1,
      );
    }
  }

  const now = new Date();

  const dynamicEntries: MetadataRoute.Sitemap = DYNAMIC_PATHS.flatMap(
    ({ path, priority, changeFrequency }) =>
      LOCALES.map((locale) => ({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
        alternates: localeAlternates(path),
      })),
  );

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap(
    ({ path, priority, changeFrequency, lastModified }) =>
      LOCALES.map((locale) => ({
        url: `${siteUrl}/${locale}${path}`,
        lastModified,
        changeFrequency,
        priority,
        alternates: localeAlternates(path),
      })),
  );

  // Upcoming events are the pages worth recrawling daily. Events that already
  // happened stay in the sitemap — they hold the rankings and links they earned
  // for the event name — but at a frequency that reflects that they no longer
  // change, so they do not compete with new listings for crawl budget.
  const today = todayInSofia();
  const eventEntries: MetadataRoute.Sitemap = slugsWithDates.map(
    ({ slug, updatedAt, startDate, endDate }) => {
      const upcoming = endDate >= today;
      // Visible "днес" / "утре" labels change as the date approaches, so
      // lastmod for events in the next two days is honestly today.
      const startsSoon = upcoming && startDate <= addIsoDays(today, 2);
      return {
        url: `${siteUrl}/${DEFAULT_LOCALE}/${slug}`,
        lastModified: startsSoon ? now : new Date(updatedAt),
        changeFrequency: upcoming ? ("daily" as const) : ("yearly" as const),
        priority: upcoming ? 0.7 : 0.3,
      };
    },
  );

  // Bulgarian only, like event pages: a profile's name, bio and event list are
  // never translated, so the other three locales are duplicates that
  // canonicalize back here anyway.
  const profileEntries: MetadataRoute.Sitemap = usernames.map((username) => ({
    url: `${siteUrl}/${DEFAULT_LOCALE}/user/${username}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Date landing pages. Like the tag hubs, a sparse one renders noindex and must
  // stay out of the sitemap, so the event count decides inclusion.
  const periodEntries: MetadataRoute.Sitemap = eventPeriodSlugs().flatMap(
    (slug) => {
      const period = resolveEventPeriod(slug);
      if (!period) return [];

      const count = upcomingEvents.filter(
        (event) =>
          event.endDate >= period.from && event.startDate <= period.to,
      ).length;
      if (count < MIN_INDEXABLE_PERIOD_EVENTS) return [];

      const path = eventPeriodPath(slug);
      return LOCALES.map((locale) => ({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: period.kind === "month" ? 0.8 : 0.9,
        alternates: localeAlternates(path),
      }));
    },
  );

  // Tag hubs are the main category landing pages, so they rank above individual
  // events for generic queries. Thin ones render noindex, so they are skipped.
  const tagEntries: MetadataRoute.Sitemap = tags.flatMap((tag) => {
    const slug = eventTagSlug(tag.title);
    if (!slug) return [];
    if ((upcomingCountByTagId.get(tag.id) ?? 0) < MIN_INDEXABLE_TAG_EVENTS) {
      return [];
    }
    return LOCALES.map((locale) => ({
      url: `${siteUrl}/${locale}/tag/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
      alternates: localeAlternates(`/tag/${slug}`),
    }));
  });

  // One entry per translation that actually exists — never per locale, since an
  // untranslated article 404s in the other three.
  const articleDetailEntries: MetadataRoute.Sitemap = articleEntries.map(
    ({ locale, slug, updatedAt }) => ({
      url: `${siteUrl}/${locale}${ARTICLES_PATH}/${slug}`,
      lastModified: new Date(updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }),
  );

  // The section index only exists meaningfully where it has content; empty
  // locales render a noindex empty state and must stay out of the sitemap.
  const localesWithArticles = new Set(
    articleEntries.map((entry) => entry.locale),
  );
  const articleIndexEntries: MetadataRoute.Sitemap = LOCALES.filter((locale) =>
    localesWithArticles.has(locale),
  ).map((locale) => ({
    url: `${siteUrl}/${locale}${ARTICLES_PATH}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    ...dynamicEntries,
    ...staticEntries,
    ...periodEntries,
    ...tagEntries,
    ...articleIndexEntries,
    ...articleDetailEntries,
    ...eventEntries,
    ...profileEntries,
  ];
}
