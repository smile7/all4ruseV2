import { transliterateCyrillicToLatin } from "~/lib/transliterate-cyrillic";

export const HOST_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const HOST_SLUG_MAX_LENGTH = 80;

/**
 * Host slugs are immutable once created — there is no redirect table, so a
 * rename would orphan every link and ranking the page has earned.
 */
export function buildHostSlugFromName(name: string): string {
  const base = transliterateCyrillicToLatin(
    name.normalize("NFKC").trim().toLowerCase(),
  )
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, HOST_SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

  return base || "host";
}
