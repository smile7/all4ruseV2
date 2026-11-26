import { DEFAULT_LOCALE } from "~/constants";
import { articlesApi } from "~/lib/api/articles";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";
import type { Article } from "~/types";

import { FEATURED_HEADER_ARTICLE_SLUG } from "./featured-header";

export type FeaturedHeaderPromo = Pick<
  Article,
  "event_tag_is_active" | "event_tag_expires_on"
>;

/**
 * Promo flags for the header button. Uncached on purpose: the locale layout is
 * ISR-heavy and a long-lived data cache left prod showing an expired promo
 * after an admin extended the date (localhost always read fresh).
 */
export async function getFeaturedHeaderPromo(): Promise<FeaturedHeaderPromo | null> {
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
}