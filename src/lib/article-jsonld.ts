import { ARTICLE_AUTHOR_LINKS } from "~/constants";
import { truncateForMeta } from "~/lib/seo";
import type { Article } from "~/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

/** BCP 47 tags for `inLanguage` — the route slug "ua" is not a valid language tag. */
const LOCALE_TO_BCP47: Record<string, string> = {
  bg: "bg-BG",
  en: "en-US",
  ua: "uk-UA",
  ro: "ro-RO",
};

/** Google's Article rich result truncates `headline` past ~110 characters. */
const MAX_HEADLINE_LENGTH = 110;

const publisher = {
  "@type": "Organization",
  name: "All4Ruse",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/android-chrome-512x512.png`,
    width: 512,
    height: 512,
  },
};

export type BreadcrumbItem = {
  name: string;
  url: string;
};

/**
 * Written generically rather than article-specific: the site has no breadcrumbs
 * anywhere today, and this is worth backporting to event detail and public
 * profile pages.
 */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildArticleJsonLd({
  article,
  url,
  imageUrl,
  authorBio,
  categoryLabel,
}: {
  article: Article;
  url: string;
  imageUrl: string | null;
  authorBio?: string;
  categoryLabel?: string;
}) {
  const author = article.author_name
    ? {
        "@type": "Person",
        name: article.author_name,
        ...(authorBio ? { description: authorBio } : {}),
        // An empty sameAs is a worse signal than no sameAs at all.
        ...(ARTICLE_AUTHOR_LINKS.length > 0
          ? { sameAs: ARTICLE_AUTHOR_LINKS }
          : {}),
      }
    : publisher;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: truncateForMeta(article.title, MAX_HEADLINE_LENGTH),
    description: truncateForMeta(article.meta_description || article.excerpt),
    url,
    ...(imageUrl ? { image: [imageUrl] } : {}),
    datePublished: article.published_at ?? article.created_at,
    dateModified: article.updated_at,
    inLanguage: LOCALE_TO_BCP47[article.locale] ?? article.locale,
    ...(categoryLabel ? { articleSection: categoryLabel } : {}),
    author,
    publisher,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    isAccessibleForFree: true,
  };
}

export function buildArticleListJsonLd({
  url,
  name,
  description,
  articles,
  buildUrl,
}: {
  url: string;
  name: string;
  description: string;
  articles: Article[];
  buildUrl: (article: Article) => string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: buildUrl(article),
        name: article.title,
      })),
    },
  };
}

/** `<` is escaped so a title containing markup cannot break out of the script tag. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
