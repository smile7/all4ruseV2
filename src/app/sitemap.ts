import type { MetadataRoute } from "next";

import { LOCALES } from "~/constants";
import { eventsApi } from "~/lib/api";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

const STATIC_PATHS = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/past", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/why-all4ruse", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/legal/cookies", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/legal/gdpr", priority: 0.3, changeFrequency: "yearly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = createSupabasePublicServerClient();
  const slugs = await eventsApi.getAllSlugs(client);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap(
    ({ path, priority, changeFrequency }) =>
      LOCALES.map((locale) => ({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
      })),
  );

  const eventEntries: MetadataRoute.Sitemap = slugs.flatMap((slug) =>
    LOCALES.map((locale) => ({
      url: `${siteUrl}/${locale}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  );

  return [...staticEntries, ...eventEntries];
}
