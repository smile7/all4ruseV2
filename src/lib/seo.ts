import { DEFAULT_LOCALE, LOCALES } from "~/constants";
import { formatCalendarDate, formatTime } from "~/lib/event-utils";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

/**
 * Maps route-level locale slugs (used in URLs: /ua/) to valid BCP 47
 * language tags (used in hreflang attributes and `<html lang>`).
 */
export const LOCALE_TO_HREFLANG: Record<string, string> = {
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

/**
 * Puts the when/where first so the SERP snippet stays useful even when Google
 * does not (yet) render an Event rich result with the relative date prefix.
 * Uses a calendar date, not "tomorrow" — meta tags are cached.
 */
export function buildEventMetaDescription({
  description,
  startDate,
  startTime,
  place,
  town,
  locale,
}: {
  description: string;
  startDate: string;
  startTime: string | null | undefined;
  place: string | null | undefined;
  town: string | null | undefined;
  locale: string;
}): string {
  const timeLabel = formatTime(startTime);
  const when = timeLabel
    ? `${formatCalendarDate(startDate, locale)}, ${timeLabel}`
    : formatCalendarDate(startDate, locale);
  const where = [place?.trim(), town?.trim()].filter(Boolean).join(", ");
  const lead = [when, where].filter(Boolean).join(" · ");
  const body = description.trim();
  return truncateForMeta(body ? `${lead} — ${body}` : lead);
}

export function buildEventAlternates(_locale: string, slug: string) {
  // Event title/description/venue are not translated. Emitting en/ua/ro as
  // hreflang alternates tells Google they are language versions — they are
  // not — and splits ranking across four duplicate URLs. Canonical + hreflang
  // both point at Bulgarian, matching how article translations already work.
  const canonical = `${SITE_URL}/${DEFAULT_LOCALE}/${slug}`;
  const hreflang = LOCALE_TO_HREFLANG[DEFAULT_LOCALE] ?? DEFAULT_LOCALE;

  return {
    canonical,
    languages: {
      [hreflang]: canonical,
      "x-default": canonical,
    },
  };
}
