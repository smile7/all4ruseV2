export function buildEventSlugFromTitle(title: string, eventId: number): string {
  let base = title
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96);
  if (!base) base = "event";
  return `${base}-${eventId}`;
}
