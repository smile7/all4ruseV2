import type { MetadataRoute } from "next";

import { LOCALES } from "~/constants";
import { eventsApi, profilesApi } from "~/lib/api";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

// Dynamic listing pages: content changes daily so lastModified = now is accurate.
const DYNAMIC_PATHS = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/past", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/current", priority: 0.7, changeFrequency: "daily" as const },
];

// Static/editorial pages: use the date the content was last meaningfully edited.
// Update these dates whenever the page copy changes.
const STATIC_PATHS = [
  {
    path: "/why-all4ruse",
    priority: 0.5,
    changeFrequency: "monthly" as const,
    lastModified: new Date("2026-01-26"),
  },
  {
    path: "/advertise",
    priority: 0.5,
    changeFrequency: "monthly" as const,
    lastModified: new Date("2026-01-26"),
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
  const [slugsWithDates, usernames] = await Promise.all([
    eventsApi.getAllSlugsWithDates(client),
    profilesApi.getAllPublicUsernames(client),
  ]);

  const now = new Date();

  const dynamicEntries: MetadataRoute.Sitemap = DYNAMIC_PATHS.flatMap(
    ({ path, priority, changeFrequency }) =>
      LOCALES.map((locale) => ({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
      })),
  );

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap(
    ({ path, priority, changeFrequency, lastModified }) =>
      LOCALES.map((locale) => ({
        url: `${siteUrl}/${locale}${path}`,
        lastModified,
        changeFrequency,
        priority,
      })),
  );

  const eventEntries: MetadataRoute.Sitemap = slugsWithDates.flatMap(
    ({ slug, createdAt }) =>
      LOCALES.map((locale) => ({
        url: `${siteUrl}/${locale}/${slug}`,
        lastModified: new Date(createdAt),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      })),
  );

  const profileEntries: MetadataRoute.Sitemap = usernames.flatMap((username) =>
    LOCALES.map((locale) => ({
      url: `${siteUrl}/${locale}/user/${username}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );

  return [
    ...dynamicEntries,
    ...staticEntries,
    ...eventEntries,
    ...profileEntries,
  ];
}
