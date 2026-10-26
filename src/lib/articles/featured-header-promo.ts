import { unstable_cache } from "next/cache";

import { DEFAULT_LOCALE } from "~/constants";
import { articlesApi } from "~/lib/api/articles";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";
import type { Article } from "~/types";

import {
  FEATURED_HEADER_ARTICLES,
  FEATURED_HEADER_CACHE_TAG,
  type FeaturedHeaderArticle,
} from "./featured-header";

export type FeaturedHeaderPromo = Pick<
  Article,
  "event_tag_is_active" | "event_tag_expires_on"
> &
  Pick<FeaturedHeaderArticle, "slug" | "titleKey">;

/**
 * Promo flags for the header buttons. Cached so the locale layout stays
 * statically rendered; the caller compares each expiry to today's Sofia date.
 * Missing articles are dropped. The caller then prefers a live temporary
 * campaign over the weekly family-weekend button.
 */
export const getFeaturedHeaderPromos = unstable_cache(
  async (): Promise<FeaturedHeaderPromo[]> => {
    const client = createSupabasePublicServerClient();
    const promos = await Promise.all(
      FEATURED_HEADER_ARTICLES.map(async (item) => {
        const article = await articlesApi.getPublishedArticleBySlug(
          client,
          DEFAULT_LOCALE,
          item.slug,
        );
        if (!article) return null;
        return {
          slug: item.slug,
          titleKey: item.titleKey,
          event_tag_is_active: article.event_tag_is_active,
          event_tag_expires_on: article.event_tag_expires_on,
        };
      }),
    );
    return promos.filter((promo) => promo !== null);
  },
  [
    "featured-header-promos",
    ...FEATURED_HEADER_ARTICLES.map((item) => item.slug),
  ],
  // Saving either article busts FEATURED_HEADER_CACHE_TAG, so the long window
  // only caps how stale an untouched promo can get.
  { revalidate: 86400, tags: [FEATURED_HEADER_CACHE_TAG] },
);
