import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ArticleCard } from "~/components/ArticleCard";
import { ArticleView } from "~/components/ArticleDetail";
import { ARTICLES_RELATED_COUNT, type Locale } from "~/constants";
import { Link } from "~/i18n/navigation";
import { articlesApi } from "~/lib/api";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from "~/lib/article-jsonld";
import { articleSlugRedirectPath } from "~/lib/article-redirects";
import {
  ARTICLES_PATH,
  buildArticleAlternates,
  buildArticleUrl,
  truncateForMeta,
} from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

const openGraphLocaleByRouteLocale: Record<Locale, string> = {
  bg: "bg_BG",
  en: "en_US",
  ua: "uk_UA",
  ro: "ro_RO",
};

/** Shared between generateMetadata and the page body so the row is fetched once. */
const getArticleCached = cache((locale: string, slug: string) =>
  articlesApi.getPublishedArticleBySlug(
    createSupabasePublicServerClient(),
    locale,
    slug,
  ),
);

const getSiblingsCached = cache((groupId: string, locale: string) =>
  articlesApi.getTranslationSiblings(
    createSupabasePublicServerClient(),
    groupId,
    locale,
  ),
);

type Props = {
  params: Promise<{ locale: string; articleSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, articleSlug } = await params;
  const redirected = articleSlugRedirectPath(articleSlug);
  if (redirected) permanentRedirect(redirected);

  const t = await getTranslations({ locale, namespace: "MoreFromRuse" });

  const article = await getArticleCached(locale, articleSlug);
  if (!article) return { title: t("notFound") };

  const siblings = await getSiblingsCached(article.group_id, locale);
  const description = truncateForMeta(
    article.meta_description || article.excerpt,
  );
  const url = buildArticleUrl(locale, article.slug);
  const safeLocale = locale as Locale;

  return {
    title: article.title,
    description,
    alternates: buildArticleAlternates(locale, article.slug, siblings),
    openGraph: {
      title: article.title,
      description,
      url,
      siteName: "All4Ruse",
      type: "article",
      publishedTime: article.published_at ?? article.created_at,
      modifiedTime: article.updated_at,
      ...(article.category ? { section: article.category } : {}),
      images: article.hero_image
        ? [
            {
              url: article.hero_image,
              width: 1200,
              height: 630,
              alt: article.hero_image_alt ?? article.title,
            },
          ]
        : [],
      locale: openGraphLocaleByRouteLocale[safeLocale],
      alternateLocale: siblings
        .map(
          (sibling) => openGraphLocaleByRouteLocale[sibling.locale as Locale],
        )
        .filter(Boolean),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.hero_image ? [article.hero_image] : [],
    },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { locale, articleSlug } = await params;
  const redirected = articleSlugRedirectPath(articleSlug);
  if (redirected) permanentRedirect(redirected);

  const t = await getTranslations({ locale, namespace: "MoreFromRuse" });

  const article = await getArticleCached(locale, articleSlug);
  // An article without a translation in this locale is a 404, never a
  // wrong-language stub.
  if (!article) notFound();

  const client = createSupabasePublicServerClient();
  const related = await articlesApi.getRelatedArticles(
    client,
    locale,
    article.id,
    ARTICLES_RELATED_COUNT,
  );

  const url = buildArticleUrl(locale, article.slug);
  const categoryLabel = article.category
    ? t(`categories.${article.category as "landmarks"}`)
    : undefined;

  const articleJsonLd = buildArticleJsonLd({
    article,
    url,
    imageUrl: article.hero_image,
    authorBio: t("authorBio"),
    categoryLabel,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("breadcrumbHome"), url: `${siteUrl}/${locale}` },
    { name: t("pageTitle"), url: `${siteUrl}/${locale}${ARTICLES_PATH}` },
    { name: article.title, url },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      <ArticleView article={article} locale={locale} />

      {related.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("relatedTitle")}
            </h2>
            <Link
              href={ARTICLES_PATH}
              className="text-primary text-sm font-medium hover:underline"
            >
              {t("allArticles")}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ArticleCard
                key={item.id}
                article={item}
                locale={locale}
                headingLevel="h3"
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
