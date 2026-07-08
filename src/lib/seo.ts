import { DEFAULT_LOCALE, LOCALES } from "~/constants";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

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
