/**
 * Retired public article slugs → the URL that should replace them.
 * Keep this as a static map: next.config.ts reads it for 308s at the edge,
 * and the article page uses it so a stale ISR 404 cannot linger.
 */
export const ARTICLE_SLUG_REDIRECTS = {
  "komediyna-esen-v-ruse-10-spektakula-i-standup-shouta":
    "komediyna-esen-v-ruse-nikolaos-kapitana-vergov",
} as const;

const ARTICLES_SEGMENT = "more-from-ruse";

export function articleSlugRedirectPath(slug: string): string | null {
  const nextSlug =
    ARTICLE_SLUG_REDIRECTS[slug as keyof typeof ARTICLE_SLUG_REDIRECTS];
  if (!nextSlug) return null;
  // The replaced article was published in Bulgarian only.
  return `/bg/${ARTICLES_SEGMENT}/${nextSlug}`;
}

export function nextConfigArticleRedirects() {
  return Object.entries(ARTICLE_SLUG_REDIRECTS).map(([from, to]) => ({
    source: `/:locale/${ARTICLES_SEGMENT}/${from}`,
    destination: `/bg/${ARTICLES_SEGMENT}/${to}`,
    permanent: true,
  }));
}
