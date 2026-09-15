import { normalizeEventTagKey } from "~/lib/event-tag-styles";
import type { Tag } from "~/types";

/**
 * Tag titles are single-token English identifiers ("THEATRE", "PUPPETTHEATRE"),
 * so the slug is derived rather than stored. Lookup compares normalized keys,
 * which means both `/tag/puppet-theatre` and `/tag/puppettheatre` resolve.
 */
export function eventTagSlug(title: string | null | undefined): string {
  return (title ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findEventTagBySlug(tags: Tag[], slug: string): Tag | undefined {
  const wanted = slug.replace(/-/g, "").toLowerCase();
  if (!wanted) return undefined;
  return tags.find(
    (tag) => normalizeEventTagKey(tag.title).toLowerCase() === wanted,
  );
}
