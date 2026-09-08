import { transliterateCyrillicToLatin } from "~/lib/transliterate-cyrillic";

/**
 * Slugs that would collide with a current or plausible future route segment
 * under /more-from-ruse/. Shared with the zod schema so the form rejects them
 * before they ever reach the database.
 */
export const ARTICLE_RESERVED_SLUGS = [
  "new",
  "edit",
  "page",
  "rss",
  "feed",
  "author",
  "category",
] as const;

export const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_SLUG_LENGTH = 80;

export function isReservedArticleSlug(slug: string): boolean {
  return (ARTICLE_RESERVED_SLUGS as readonly string[]).includes(slug);
}

/**
 * Unlike event slugs, article slugs carry no `-{id}` suffix: the slug is the
 * strongest on-page keyword signal, so it stays clean and readable. Uniqueness
 * is enforced by the (locale, slug) unique index and checked in the form.
 */
export function buildArticleSlugFromTitle(title: string): string {
  const base = transliterateCyrillicToLatin(
    title.normalize("NFKC").trim().toLowerCase(),
  )
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // Trimming to a fixed length can leave a dangling hyphen mid-word.
    .replace(/-+$/g, "");

  return base || "article";
}
