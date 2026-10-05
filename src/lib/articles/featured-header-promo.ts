import { unstable_cache } from "next/cache";

import { DEFAULT_LOCALE } from "~/constants";
import { articlesApi } from "~/lib/api/articles";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";
import type { Article } from "~/types";

import {
  FEATURED_HEADER_ARTICLE_SLUG,
  FEATURED_HEADER_CACHE_TAG,
} from "./featured-header";

export type FeaturedHeaderPromo = Pick<
  Article,
  "event_tag_is_active" | "event_tag_expires_on"
>;

/**
 * Promo flags for the header button. Cached so the locale layout stays
 * statically rendered; the caller compares the expiry to today's Sofia date.
 */
export const getFeaturedHeaderPromo = unstable_cache(
  async (): Promise<FeaturedHeaderPromo | null> => {
    const article = await articlesApi.getPublishedArticleBySlug(
      createSupabasePublicServerClient(),
      DEFAULT_LOCALE,
      FEATURED_HEADER_ARTICLE_SLUG,
    );
    if (!article) return null;
    return {
      event_tag_is_active: article.event_tag_is_active,
      event_tag_expires_on: article.event_tag_expires_on,
    };
  },
  ["featured-header-promo"],
  { revalidate: 300, tags: [FEATURED_HEADER_CACHE_TAG] },
);
