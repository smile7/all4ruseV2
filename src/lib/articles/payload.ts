import { revalidatePath } from "next/cache";

import { ARTICLES_BUCKET } from "~/constants";
import {
  addHeadingIds,
  estimateReadingMinutes,
  sanitizeArticleHtml,
} from "~/lib/article-html";
import { ARTICLES_PATH } from "~/lib/seo";
import type { Article, ArticleFormValues } from "~/types";
import type { TablesInsert } from "~/types/database";

/** Empty strings from the form must land in the database as null, not "". */
function nullify(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildArticleRow(
  values: ArticleFormValues,
  existing?: Article | null,
): TablesInsert<"articles"> {
  const bodyHtml = addHeadingIds(
    sanitizeArticleHtml(values.body_html, { sponsored: values.is_sponsored }),
  );

  const publishing = values.status === "published";
  // datePublished must not move when an already-published article is edited.
  const publishedAt = publishing
    ? (existing?.published_at ?? new Date().toISOString())
    : null;

  return {
    locale: values.locale,
    ...(values.group_id ? { group_id: values.group_id } : {}),
    slug: values.slug.trim().toLowerCase(),
    title: values.title.trim(),
    excerpt: values.excerpt.trim(),
    meta_description: nullify(values.meta_description),
    body_html: bodyHtml,
    hero_image: nullify(values.hero_image),
    hero_image_alt: nullify(values.hero_image_alt),
    category: nullify(values.category),
    author_name: nullify(values.author_name),
    is_sponsored: values.is_sponsored,
    sponsor_name: values.is_sponsored ? nullify(values.sponsor_name) : null,
    sponsor_url: values.is_sponsored ? nullify(values.sponsor_url) : null,
    status: values.status,
    reading_minutes: estimateReadingMinutes(bodyHtml),
    published_at: publishedAt,
  };
}

/**
 * Both pages are ISR with a 300 s window, so without this an edit would sit
 * invisible for up to five minutes. The homepage teaser is revalidated too.
 */
export function revalidateArticle(locale: string, slugs: string[]) {
  revalidatePath(`/${locale}${ARTICLES_PATH}`);
  revalidatePath(`/${locale}`);
  for (const slug of new Set(slugs)) {
    revalidatePath(`/${locale}${ARTICLES_PATH}/${slug}`);
  }
}

/**
 * Public storage URL → object path, so a deleted article does not leave its
 * hero image behind in the bucket.
 */
export function storagePathFromPublicUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${ARTICLES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}
