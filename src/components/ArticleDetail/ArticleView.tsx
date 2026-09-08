import { getTranslations } from "next-intl/server";

import { ArticleEditButton } from "~/components/ArticleDetail/ArticleEditButton";
import { ArticleHeroGallery } from "~/components/ArticleDetail/ArticleHeroGallery";
import { ArticleImageLightbox } from "~/components/ArticleDetail/ArticleImageLightbox";
import { ArticleSiteLinks } from "~/components/ArticleDetail/ArticleSiteLinks";
import { ArticleTableOfContents } from "~/components/ArticleDetail/ArticleTableOfContents";
import { Typography } from "~/components/layout";
import { Badge } from "~/components/ui/badge";
import { Link } from "~/i18n/navigation";
import {
  ARTICLE_BODY_CLASSES,
  enhanceArticleBodyHtml,
  extractArticleHeadings,
  sanitizeArticleHtml,
} from "~/lib/article-html";
import { getIntlLocale } from "~/lib/event-utils";
import { ARTICLES_PATH } from "~/lib/seo";
import type { Article, ArticleCategory } from "~/types";

/** Fewer than this and a table of contents is just noise. */
const MIN_HEADINGS_FOR_TOC = 3;

type Props = {
  article: Article;
  locale: string;
};

export async function ArticleView({ article, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "MoreFromRuse" });

  // Sanitized on write and again on read, so a row edited directly in the
  // Supabase Dashboard still cannot inject anything.
  const sanitizedBody = sanitizeArticleHtml(article.body_html, {
    sponsored: article.is_sponsored,
  });
  const bodyHtml = enhanceArticleBodyHtml(sanitizedBody);
  const headings = extractArticleHeadings(sanitizedBody);
  const tocHeadings = headings.filter((heading) => heading.level === 2);

  const publishedAt = article.published_at ?? article.created_at;
  const formattedDate = new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(publishedAt));

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              {t("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={ARTICLES_PATH}
              className="hover:text-foreground transition-colors"
            >
              {t("pageTitle")}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-foreground line-clamp-1">{article.title}</li>
        </ol>
      </nav>

      {article.is_sponsored && article.sponsor_name && (
        <p className="border-primary/40 bg-primary/5 text-primary mb-4 rounded-md border px-3 py-2 text-xs font-medium">
          {t("sponsoredBy", { sponsor: article.sponsor_name })}
        </p>
      )}

      <Typography.H1 className="text-3xl leading-tight text-balance sm:text-4xl">
        {article.title}
      </Typography.H1>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          {article.author_name && (
            <>
              <span>{t("byAuthor", { author: article.author_name })}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <time dateTime={publishedAt}>{formattedDate}</time>
          {article.reading_minutes ? (
            <>
              <span aria-hidden>·</span>
              <span>
                {t("readingTime", { minutes: article.reading_minutes })}
              </span>
            </>
          ) : null}
          {article.category && (
            <Badge variant="secondary">
              {t(`categories.${article.category as ArticleCategory}`)}
            </Badge>
          )}
        </div>
        <ArticleEditButton articleId={article.id} />
      </div>

      <ArticleImageLightbox>
        {article.hero_image && (
          <div className="mt-6">
            {/* Fixed aspect ratio reserves the space so the hero cannot shift layout. */}
            <ArticleHeroGallery
              src={article.hero_image}
              alt={article.hero_image_alt ?? ""}
              title={article.title}
            />
          </div>
        )}

        {tocHeadings.length >= MIN_HEADINGS_FOR_TOC && (
          <ArticleTableOfContents locale={locale} headings={tocHeadings} />
        )}

        <div
          className={`mt-6 ${ARTICLE_BODY_CLASSES}`}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </ArticleImageLightbox>

      <ArticleSiteLinks locale={locale} />
    </article>
  );
}
