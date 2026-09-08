import { DEFAULT_LOCALE, LOCALES } from "~/constants";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

/**
 * Maps route-level locale slugs (used in URLs: /ua/) to valid BCP 47
 * language tags (used in hreflang attributes).
 */
const LOCALE_TO_HREFLANG: Record<string, string> = {
  bg: "bg",
  en: "en",
  ua: "uk", // URL slug "ua" → BCP 47 "uk" (Ukrainian)
  ro: "ro",
};

/**
 * Builds the `alternates` block for Next.js `generateMetadata`.
 *
 * - Canonical and hreflang URLs are absolute (required by Google).
 * - hreflang keys use proper BCP 47 codes (e.g. "uk" not "ua").
 * - x-default points to the default locale.
 * - `path` should start with "/" or be "" for the locale root.
 */
export function buildAlternates(locale: string, path: string = "") {
  const languages: Record<string, string> = {};

  for (const lang of LOCALES) {
    const hreflang = LOCALE_TO_HREFLANG[lang] ?? lang;
    languages[hreflang] = `${SITE_URL}/${lang}${path}`;
  }

  // x-default — signals the "default" URL for unmatched languages
  languages["x-default"] = `${SITE_URL}/${DEFAULT_LOCALE}${path}`;

  return {
    canonical: `${SITE_URL}/${locale}${path}`,
    languages,
  };
}

/**
 * Builds absolute hreflang + canonical alternates for event detail pages,
 * which use a slug instead of a fixed path.
 */
export const ARTICLES_PATH = "/more-from-ruse";

export function buildArticleUrl(locale: string, slug: string) {
  return `${SITE_URL}/${locale}${ARTICLES_PATH}/${slug}`;
}

/**
 * Article alternates differ from `buildAlternates`, which blindly emits all four
 * locales. Articles are translated one row at a time, so hreflang may only point
 * at translations that actually exist — otherwise Google follows the link, gets
 * a 404, and distrusts the whole hreflang set.
 *
 * `siblings` must contain published translations only, excluding the current one.
 */
export function buildArticleAlternates(
  locale: string,
  slug: string,
  siblings: { locale: string; slug: string }[],
) {
  const languages: Record<string, string> = {};

  // Google treats a hreflang set without a self-reference as invalid.
  languages[LOCALE_TO_HREFLANG[locale] ?? locale] = buildArticleUrl(
    locale,
    slug,
  );

  for (const sibling of siblings) {
    const hreflang = LOCALE_TO_HREFLANG[sibling.locale] ?? sibling.locale;
    languages[hreflang] = buildArticleUrl(sibling.locale, sibling.slug);
  }

  const bulgarian =
    locale === DEFAULT_LOCALE
      ? { locale, slug }
      : siblings.find((sibling) => sibling.locale === DEFAULT_LOCALE);

  languages["x-default"] = bulgarian
    ? buildArticleUrl(bulgarian.locale, bulgarian.slug)
    : buildArticleUrl(locale, slug);

  return {
    canonical: buildArticleUrl(locale, slug),
    languages,
  };
}

/**
 * Trims to a meta-description length on a word boundary — a description cut
 * mid-word reads as broken in the SERP snippet.
 */
export function truncateForMeta(text: string, maxLength = 160): string {
  const normalized = text.trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized
    .slice(0, maxLength)
    .replace(/\s+\S*$/, "")
    .trim();
}

export function buildEventAlternates(locale: string, slug: string) {
  const languages: Record<string, string> = {};

  for (const lang of LOCALES) {
    const hreflang = LOCALE_TO_HREFLANG[lang] ?? lang;
    languages[hreflang] = `${SITE_URL}/${lang}/${slug}`;
  }

  languages["x-default"] = `${SITE_URL}/${DEFAULT_LOCALE}/${slug}`;

  return {
    canonical: `${SITE_URL}/${locale}/${slug}`,
    languages,
  };
}
