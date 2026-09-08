import { getTranslations } from "next-intl/server";

import { ArticleCard } from "~/components/ArticleCard";
import { Link } from "~/i18n/navigation";
import { ARTICLES_PATH } from "~/lib/seo";
import type { Article } from "~/types";

type Props = {
  articles: Article[];
  locale: string;
};

/**
 * Sits below the events grid on purpose: the events list is the homepage's
 * primary content and owns the LCP element, so the teaser never uses `priority`.
 */
export async function ArticlesTeaser({ articles, locale }: Props) {
  if (articles.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "HomePage" });

  return (
    <section className="mt-16 text-left">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          <Link
            href={ARTICLES_PATH}
            className="hover:text-primary transition-colors"
          >
            {t("moreFromRuseTitle")}
          </Link>
        </h2>
        <Link
          href={ARTICLES_PATH}
          className="text-primary text-sm font-medium hover:underline"
        >
          {t("moreFromRuseSeeAll")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} locale={locale} />
        ))}
      </div>
    </section>
  );
}
