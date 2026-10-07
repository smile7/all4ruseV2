import {
  DEFAULT_LOCALE,
  FALLBACK_IMAGE,
  LOCALES,
  SCHEMA_FALLBACK_IMAGE,
} from "~/constants";
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
 * Canonical + hreflang for pages whose body content only ever exists in
 * Bulgarian — event details and public profiles. Titles, descriptions, venues
 * and bios are never translated, so declaring en/ua/ro as language versions
 * tells Google they are translations when they are near-identical duplicates,
 * and splits ranking across four URLs. Canonical and hreflang both point at
 * Bulgarian. Emit this on every locale URL so Google can report the others as
 * alternates with a proper canonical.
 */
export function buildDefaultLocaleAlternates(path: string) {
  const canonical = `${SITE_URL}/${DEFAULT_LOCALE}${path}`;
  const hreflang = LOCALE_TO_HREFLANG[DEFAULT_LOCALE] ?? DEFAULT_LOCALE;

  return {
    canonical,
    languages: {
      [hreflang]: canonical,
      "x-default": canonical,
    },
  };
}

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
 * Drops unpaired UTF-16 surrogates. `JSON.stringify` encodes a lone high
 * surrogate as `\ud83d` with no following `\uXXXX`; Google then reports
 * "Truncated Unicode character" and the item is ineligible for rich results.
 */
export function stripLoneSurrogates(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text[i]! + text[i + 1]!;
        i += 1;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    out += text[i]!;
  }
  return out;
}

/** Truncate without splitting a surrogate pair (emoji, some symbols). */
export function sliceUtf16Safe(text: string, maxLength: number): string {
  if (maxLength <= 0) return "";
  if (text.length <= maxLength) return text;
  let end = maxLength;
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return text.slice(0, end);
}

/**
 * Trims to a meta-description length on a word boundary — a description cut
 * mid-word reads as broken in the SERP snippet.
 */
export function truncateForMeta(text: string, maxLength = 160): string {
  const normalized = stripLoneSurrogates(text.trim());
  if (normalized.length <= maxLength) return normalized;
  return sliceUtf16Safe(normalized, maxLength)
    .replace(/\s+\S*$/u, "")
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
  return buildDefaultLocaleAlternates(`/${slug}`);
}

/**
 * City in the title tag is how local event directories (and the competitor)
 * keep "Русе" in the SERP without stuffing the H1.
 */
export function eventDocumentTitle(title: string, city: string): string {
  const haystack = title.toLocaleLowerCase();
  if (
    haystack.includes(city.toLocaleLowerCase()) ||
    haystack.includes("русе") ||
    haystack.includes("ruse")
  ) {
    return title;
  }
  return `${title} | ${city}`;
}

export function buildProfileAlternates(username: string) {
  return buildDefaultLocaleAlternates(`/user/${username}`);
}

/**
 * Google Event/Article rich results warn on a missing `image`. Skip the UI
 * placeholder and, when nothing representative exists, emit the branded OG
 * image so the field is always a crawlable absolute URL.
 */
export function jsonLdImages(
  ...urls: Array<string | null | undefined>
): string[] {
  const unique = [
    ...new Set(
      urls.flatMap((url) => {
        if (!url || url === FALLBACK_IMAGE) return [];
        if (url.startsWith("/")) return [`${SITE_URL}${url}`];
        return [url];
      }),
    ),
  ].slice(0, 6);
  return unique.length > 0
    ? unique
    : [`${SITE_URL}${SCHEMA_FALLBACK_IMAGE}`];
}

/**
 * hreflang for the article index. Only locales that actually have a published
 * article belong in the set: the rest render a noindex empty state, and Google
 * discards an entire hreflang cluster that points at URLs it was told not to
 * index.
 */
export function buildArticleIndexAlternates(
  canonical: string,
  localesWithArticles: string[],
) {
  const languages: Record<string, string> = {};

  for (const locale of localesWithArticles) {
    languages[LOCALE_TO_HREFLANG[locale] ?? locale] =
      `${SITE_URL}/${locale}${ARTICLES_PATH}`;
  }

  if (localesWithArticles.includes(DEFAULT_LOCALE)) {
    languages["x-default"] = `${SITE_URL}/${DEFAULT_LOCALE}${ARTICLES_PATH}`;
  }

  return { canonical, languages };
}
