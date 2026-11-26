import { resolveEventPeriod, WEEKEND_SLUG } from "~/lib/event-periods";
import { todayInSofia } from "~/lib/event-utils";

/** Bulgarian article linked from the header campaign button. */
export const FEATURED_HEADER_ARTICLE_SLUG =
  "kakvo-da-pravim-s-detsata-v-ruse-tozi-uikend";

export function isFeaturedHeaderArticle(slug: string): boolean {
  return slug === FEATURED_HEADER_ARTICLE_SLUG;
}

/** Last promo day for the weekly column: end of this/upcoming weekend in Sofia. */
export function featuredHeaderPromoExpiryDay(
  today: string = todayInSofia(),
): string {
  return resolveEventPeriod(WEEKEND_SLUG, today)?.to ?? today;
}

/** Invalidated when that article is saved, so the header follows its promo flags. */
export const FEATURED_HEADER_CACHE_TAG = "featured-header-article";