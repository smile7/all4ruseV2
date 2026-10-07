import type { Article } from "~/types";

/**
 * Date readers see. A recurring column keeps one URL, so this follows the last
 * save (`updated_at`) rather than the original publish instant.
 * Structured data still keeps `datePublished` stable.
 */
export function articleDisplayDate(
  article: Pick<Article, "updated_at" | "published_at" | "created_at">,
): string {
  return article.updated_at || article.published_at || article.created_at;
}
