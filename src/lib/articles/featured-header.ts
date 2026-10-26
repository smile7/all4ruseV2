/**
 * The standing weekly header button. It shows whenever its promo is live and
 * no temporary campaign below is still running.
 */
export const WEEKLY_HEADER_ARTICLE = {
  slug: "kakvo-da-pravim-s-detsata-v-ruse-tozi-uikend",
  titleKey: "featuredArticleWeekendTitle",
} as const;

/**
 * One-off header buttons. While any of these promos is still live, they
 * replace the weekly button. After the last one expires, the weekly article
 * comes back without a code change.
 */
export const TEMPORARY_HEADER_ARTICLES = [
  {
    slug: "helouin-v-ruse-12-subitiya-za-detsa",
    titleKey: "featuredArticleKidsTitle",
  },
  {
    slug: "helouin-subitiya-v-ruse-za-vuzrastni",
    titleKey: "featuredArticleAdultsTitle",
  },
] as const;

export const FEATURED_HEADER_ARTICLES = [
  ...TEMPORARY_HEADER_ARTICLES,
  WEEKLY_HEADER_ARTICLE,
] as const;

export type FeaturedHeaderArticle = (typeof FEATURED_HEADER_ARTICLES)[number];

export function isFeaturedHeaderArticle(slug: string): boolean {
  return FEATURED_HEADER_ARTICLES.some((article) => article.slug === slug);
}

/**
 * Temporary buttons win for as long as any of them is live. Otherwise the
 * weekly article is the only header button.
 */
export function pickVisibleHeaderPromos<T extends { slug: string }>(
  live: readonly T[],
): T[] {
  const bySlug = new Map(live.map((promo) => [promo.slug, promo]));
  const temporary = TEMPORARY_HEADER_ARTICLES.flatMap((article) => {
    const promo = bySlug.get(article.slug);
    return promo ? [promo] : [];
  });
  if (temporary.length > 0) return temporary;

  const weekly = bySlug.get(WEEKLY_HEADER_ARTICLE.slug);
  return weekly ? [weekly] : [];
}

/** Invalidated when a header article is saved, so the buttons follow its promo flags. */
export const FEATURED_HEADER_CACHE_TAG = "featured-header-article";
