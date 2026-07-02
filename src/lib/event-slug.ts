import { transliterateCyrillicToLatin } from "~/lib/transliterate-cyrillic";

export function buildEventSlugFromTitle(
  title: string,
  eventId: number,
): string {
  let base = transliterateCyrillicToLatin(
    title.normalize("NFKC").trim().toLowerCase(),
  )
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  if (!base) base = "event";
  return `${base}-${eventId}`;
}
