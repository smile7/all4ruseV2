import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ArticleCard } from "~/components/ArticleCard";
import { Typography } from "~/components/layout";
import { ARTICLES_PAGE_SIZE } from "~/constants";
import { Link } from "~/i18n/navigation";
import { articlesApi } from "~/lib/api";
import { buildArticleListJsonLd, serializeJsonLd } from "~/lib/article-jsonld";
import { ARTICLES_PATH, buildAlternates, buildArticleUrl } from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

function parsePage(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function indexUrl(locale: string, page: number): string {
  const base = `${siteUrl}/${locale}${ARTICLES_PATH}`;
  return page > 1 ? `${base}?page=${page}` : base;
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = parsePage((await searchParams).page);
  const t = await getTranslations({ locale, namespace: "MoreFromRuse" });

  const client = createSupabasePublicServerClient();
  const { total } = await articlesApi.getPublishedArticles(client, {
    locale,
    page: 1,
    pageSize: 1,
  });

  const alternates = buildAlternates(locale, ARTICLES_PATH);

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: {
      ...alternates,
      // Paginated archives must self-canonicalize; pointing page 2 at page 1
      // hides its articles from Google entirely.
      canonical: indexUrl(locale, page),
    },
    // Four empty archive pages must not enter the index.
    ...(total === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: t("pageTitle"),
      description: t("pageDescription"),
      url: indexUrl(locale, page),
      siteName: "All4Ruse",
      type: "website",
    },
  };
}

export default async function MoreFromRusePage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const page = parsePage((await searchParams).page);
  const t = await getTranslations({ locale, namespace: "MoreFromRuse" });

  const client = createSupabasePublicServerClient();
  const { articles, total } = await articlesApi.getPublishedArticles(client, {
    locale,
    page,
    pageSize: ARTICLES_PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ARTICLES_PAGE_SIZE));
  if (page > 1 && page > totalPages) notFound();

  const jsonLd = buildArticleListJsonLd({
    url: indexUrl(locale, page),
    name: t("pageTitle"),
    description: t("pageDescription"),
    articles,
    buildUrl: (article) => buildArticleUrl(locale, article.slug),
  });

  return (
    <>
      {articles.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 max-w-3xl">
          <Typography.H1 className="text-3xl sm:text-4xl">
            {t("pageTitle")}
          </Typography.H1>
          {/* <p className="text-muted-foreground mt-3 leading-7">{t("intro")}</p> */}
        </header>

        {articles.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">
            {t("empty")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                locale={locale}
                priority={page === 1 && index === 0}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            aria-label={t("pageIndicator", { page, total: totalPages })}
            className="mt-10 flex items-center justify-between gap-4"
          >
            {page > 1 ? (
              <Link
                rel="prev"
                href={{
                  pathname: ARTICLES_PATH,
                  query: page - 1 > 1 ? { page: page - 1 } : {},
                }}
                className="text-primary text-sm font-medium hover:underline"
              >
                ← {t("previousPage")}
              </Link>
            ) : (
              <span />
            )}

            <span className="text-muted-foreground text-sm">
              {t("pageIndicator", { page, total: totalPages })}
            </span>

            {page < totalPages ? (
              <Link
                rel="next"
                href={{
                  pathname: ARTICLES_PATH,
                  query: { page: page + 1 },
                }}
                className="text-primary text-sm font-medium hover:underline"
              >
                {t("nextPage")} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </>
  );
}
